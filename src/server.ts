import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { messagingApi, type WebhookEvent } from '@line/bot-sdk';
import { eq, and, desc } from 'drizzle-orm';

import { createDb } from './db/index.js';
import {
  groups,
  trips,
  tripMembers,
  datePolls,
  availabilities,
  bills,
  billItems,
  billItemShares,
  settlements,
  tripReminders,
} from './db/schema.js';
import { parseCommand } from './core/commandParser.js';
import { enumerateDates, rankDateWindows, type AvailabilityRecord } from './core/dateMatcher.js';
import { calculateBill } from './core/billCalculator.js';
import { calculateSettlements } from './core/settlementEngine.js';
import { getBangkokDateIso, getDueReminderKey, buildReminderText } from './core/reminderEngine.js';
import {
  buildWelcomeFlex,
  buildTripCreatedFlex,
  buildTripListFlex,
  buildTripCompletedFlex,
  buildMembersFlex,
} from './flex/tripFlex.js';
import { buildCalendarPollFlex } from './flex/calendarFlex.js';
import { buildBillReceiptFlex, buildBillMenuFlex } from './flex/billFlex.js';
import { buildSettlementFlex } from './flex/settlementFlex.js';
import { buildHelpFlex } from './flex/helpFlex.js';
import { renderPickPage } from './web/pickPage.js';

const PORT = Number(process.env.PORT || 3000);
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const { db } = createDb();
const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
});

const app = Fastify({ logger: true });

const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  await app.register(fastifyStatic, { root: publicDir, prefix: '/' });
}

app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    (req as unknown as { rawBody: string }).rawBody = body as string;
    done(null, JSON.parse(body as string));
  } catch (err) {
    done(err as Error, undefined);
  }
});

function verifyLineSignature(rawBody: string, signature: string | undefined): boolean {
  if (!CHANNEL_SECRET) return true;
  if (!signature) return false;
  const hash = crypto
    .createHmac('sha256', CHANNEL_SECRET)
    .update(rawBody)
    .digest('base64');
  return hash === signature;
}

app.get('/health', async () => {
  return { status: 'ok', bot: 'PromptPai (พร้อมไป)' };
});

app.get('/pick', async (request, reply) => {
  const query = request.query as { pollId?: string };
  const pollId = Number(query.pollId);
  const poll = db.select().from(datePolls).where(eq(datePolls.id, pollId)).get();
  if (!poll) return reply.code(404).send('Poll not found');
  const trip = db.select().from(trips).where(eq(trips.id, poll.tripId)).get();
  if (!trip) return reply.code(404).send('Trip not found');

  const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
  const rows = db.select().from(availabilities).where(eq(availabilities.pollId, poll.id)).all();

  const html = renderPickPage({
    pollId: poll.id,
    tripName: trip.name,
    startDate: poll.startDate,
    endDate: poll.endDate,
    durationDays: poll.durationDays,
    members: members.map((m) => ({ id: m.id, displayName: m.displayName, isGuest: m.isGuest })),
    records: rows.map((r) => ({
      memberId: r.memberId,
      date: r.date,
      status: r.status as 'FREE' | 'MAYBE' | 'BUSY',
    })),
  });
  return reply.type('text/html; charset=utf-8').send(html);
});

app.post('/api/pick', async (request, reply) => {
  const body = request.body as {
    pollId: number;
    memberId: number;
    entries: Array<{ date: string; status: 'FREE' | 'MAYBE' | 'BUSY' }>;
  };
  const poll = db.select().from(datePolls).where(eq(datePolls.id, body.pollId)).get();
  if (!poll) return reply.code(404).send({ error: 'Poll not found' });
  const trip = db.select().from(trips).where(eq(trips.id, poll.tripId)).get();
  if (!trip) return reply.code(404).send({ error: 'Trip not found' });

  // Replace member's existing records in this poll with batch entries
  db.delete(availabilities)
    .where(and(eq(availabilities.pollId, poll.id), eq(availabilities.memberId, body.memberId)))
    .run();

  for (const e of body.entries) {
    upsertAvailability(poll.id, body.memberId, e.date, e.status);
  }

  const flex = buildPollFlexForId(poll.id, 'FREE');
  if (flex && trip.groupId) {
    try {
      await lineClient.pushMessage({ to: trip.groupId, messages: [flex] });
    } catch (err) {
      request.log.error(err, 'Failed to push batch availability update');
    }
  }

  return { ok: true };
});

app.post('/webhook', async (request, reply) => {
  const rawBody = (request as unknown as { rawBody: string }).rawBody || '';
  const signature = request.headers['x-line-signature'] as string | undefined;

  if (!verifyLineSignature(rawBody, signature)) {
    return reply.code(401).send({ error: 'Invalid LINE signature' });
  }

  const body = request.body as { events?: WebhookEvent[] };
  const events = body.events ?? [];

  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (err) {
      request.log.error(err, 'Error handling LINE event');
    }
  }

  return reply.code(200).send({ ok: true });
});

async function handleEvent(event: WebhookEvent) {
  const source = event.source;
  const groupId = source.type === 'group' ? source.groupId : source.type === 'room' ? source.roomId : source.userId;
  if (!groupId) return;

  if (event.type === 'join') {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [buildWelcomeFlex()],
    });
    return;
  }

  if (event.type === 'postback') {
    await handlePostback(event, groupId);
    return;
  }

  if (event.type === 'message' && event.message.type === 'text') {
    await handleTextMessage(event, groupId, event.message.text);
  }
}

async function ensureUserProfile(
  groupId: string,
  userId: string,
): Promise<{ displayName: string; avatarUrl: string | null }> {
  try {
    const profile = await lineClient.getGroupMemberProfile(groupId, userId);
    return { displayName: profile.displayName, avatarUrl: profile.pictureUrl ?? null };
  } catch {
    return { displayName: `เพื่อน-${userId.slice(-4)}`, avatarUrl: null };
  }
}

async function ensureMemberInTrip(tripId: number, groupId: string, userId: string) {
  const existing = db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.lineUserId, userId)))
    .get();
  if (existing) {
    if (!existing.avatarUrl) {
      const prof = await ensureUserProfile(groupId, userId);
      if (prof.avatarUrl) {
        db.update(tripMembers)
          .set({ avatarUrl: prof.avatarUrl, displayName: prof.displayName })
          .where(eq(tripMembers.id, existing.id))
          .run();
        return { ...existing, avatarUrl: prof.avatarUrl, displayName: prof.displayName };
      }
    }
    return existing;
  }

  const prof = await ensureUserProfile(groupId, userId);
  return db
    .insert(tripMembers)
    .values({
      tripId,
      lineUserId: userId,
      displayName: prof.displayName,
      avatarUrl: prof.avatarUrl,
      isGuest: false,
      createdAt: new Date().toISOString(),
    })
    .returning()
    .get();
}

function getActiveTrip(groupId: string) {
  const grp = db.select().from(groups).where(eq(groups.groupId, groupId)).get();
  if (!grp?.activeTripId) return null;
  return db.select().from(trips).where(eq(trips.id, grp.activeTripId)).get() ?? null;
}

function upsertAvailability(pollId: number, memberId: number, date: string, status: 'FREE' | 'MAYBE' | 'BUSY') {
  const now = new Date().toISOString();
  const existing = db
    .select()
    .from(availabilities)
    .where(and(eq(availabilities.pollId, pollId), eq(availabilities.memberId, memberId), eq(availabilities.date, date)))
    .get();
  if (existing) {
    db.update(availabilities).set({ status, updatedAt: now }).where(eq(availabilities.id, existing.id)).run();
  } else {
    db.insert(availabilities).values({ pollId, memberId, date, status, updatedAt: now }).run();
  }
}

function buildPollFlexForId(pollId: number, activeMode: 'FREE' | 'MAYBE' | 'BUSY' = 'FREE') {
  const poll = db.select().from(datePolls).where(eq(datePolls.id, pollId)).get();
  if (!poll) return null;
  const trip = db.select().from(trips).where(eq(trips.id, poll.tripId)).get();
  if (!trip) return null;

  const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
  const rows = db.select().from(availabilities).where(eq(availabilities.pollId, poll.id)).all();

  const records: AvailabilityRecord[] = rows.map((r) => ({
    memberId: r.memberId,
    date: r.date,
    status: r.status as 'FREE' | 'MAYBE' | 'BUSY',
  }));

  const respondedMemberIds = new Set(rows.map((r) => r.memberId));
  const topWindows = rankDateWindows({
    startDate: poll.startDate,
    endDate: poll.endDate,
    durationDays: poll.durationDays,
    memberIds: members.map((m) => m.id),
    records,
  });

  return buildCalendarPollFlex({
    pollId: poll.id,
    tripName: trip.name,
    startDate: poll.startDate,
    endDate: poll.endDate,
    durationDays: poll.durationDays,
    respondedCount: respondedMemberIds.size,
    members: members.map((m) => ({ id: m.id, displayName: m.displayName })),
    activeMode,
    records,
    topWindows,
  });
}

function syncAndBuildSettlementFlex(tripId: number, tripName: string) {
  const now = new Date().toISOString();
  const tripBills = db.select().from(bills).where(eq(bills.tripId, tripId)).all();
  const allMembers = db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).all();
  const memberMap = new Map(allMembers.map((m) => [m.id, m.displayName]));

  const summaries = tripBills.map((b) => {
    const items = db.select().from(billItems).where(eq(billItems.billId, b.id)).all();
    const calcItems = items.map((it) => {
      const shares = db.select().from(billItemShares).where(eq(billItemShares.billItemId, it.id)).all();
      const exactAmounts: Record<number, number> = {};
      for (const s of shares) {
        if (s.exactAmount !== null && s.exactAmount !== undefined) {
          exactAmounts[s.memberId] = s.exactAmount;
        }
      }
      return {
        name: it.name,
        amount: it.amount,
        isAddon: it.isAddon,
        participantIds: shares.map((s) => s.memberId),
        ...(Object.keys(exactAmounts).length > 0 ? { exactAmounts } : {}),
      };
    });
    const calc = calculateBill({
      items: calcItems,
      vatPercent: b.vatPercent,
      serviceChargePercent: b.serviceChargePercent,
      discountAmount: b.discountAmount,
    });
    return {
      payerMemberId: b.payerMemberId,
      totalAmount: b.totalAmount,
      shares: calc.shares.map((s) => ({ memberId: s.memberId, netTotal: s.netTotal })),
    };
  });

  const res = calculateSettlements(summaries);
  const existingRows = db.select().from(settlements).where(eq(settlements.tripId, tripId)).all();

  // Check if computed transfers match existing rows (preserve PENDING/WAITING_CONFIRM/CONFIRMED)
  const key = (fromId: number, toId: number, amt: number) => `${fromId}->${toId}:${amt}`;
  const existingMap = new Map(existingRows.map((r) => [key(r.fromMemberId, r.toMemberId, r.amount), r]));
  const computedKeys = new Set(res.transfers.map((t) => key(t.fromMemberId, t.toMemberId, t.amount)));

  const isSameSet =
    existingRows.length === res.transfers.length &&
    res.transfers.every((t) => existingMap.has(key(t.fromMemberId, t.toMemberId, t.amount)));

  let finalRows = existingRows;
  if (!isSameSet) {
    db.delete(settlements).where(eq(settlements.tripId, tripId)).run();
    finalRows = res.transfers.map((t) => {
      const prev = existingMap.get(key(t.fromMemberId, t.toMemberId, t.amount));
      return db
        .insert(settlements)
        .values({
          tripId,
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
          amount: t.amount,
          status: prev && computedKeys.has(key(t.fromMemberId, t.toMemberId, t.amount)) ? prev.status : 'PENDING',
          updatedAt: now,
        })
        .returning()
        .get();
    });
  }

  return buildSettlementFlex({
    tripId,
    tripName,
    transfers: finalRows.map((s) => ({
      settlementId: s.id,
      fromName: memberMap.get(s.fromMemberId) || 'เพื่อน',
      toName: memberMap.get(s.toMemberId) || 'เพื่อน',
      amount: s.amount,
      status: s.status,
    })),
  });
}

function closeTripAndBuildFlex(groupId: string, tripId: number) {
  const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
  if (!trip) return null;

  db.update(trips).set({ status: 'COMPLETED' }).where(eq(trips.id, tripId)).run();
  const grp = db.select().from(groups).where(eq(groups.groupId, groupId)).get();
  if (grp?.activeTripId === tripId) {
    db.update(groups).set({ activeTripId: null }).where(eq(groups.groupId, groupId)).run();
  }

  const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).all();
  const tripBills = db.select().from(bills).where(eq(bills.tripId, tripId)).all();
  const totalSpend = tripBills.reduce((s, b) => s + b.totalAmount, 0);

  return buildTripCompletedFlex({
    tripName: trip.name,
    lockedStartDate: trip.lockedStartDate,
    lockedEndDate: trip.lockedEndDate,
    memberCount: members.length,
    billCount: tripBills.length,
    totalSpend,
  });
}

async function handleTextMessage(
  event: Extract<WebhookEvent, { type: 'message' }>,
  groupId: string,
  text: string,
) {
  const parsed = parseCommand(text);
  if (parsed.type === 'UNKNOWN') return;

  const userId = event.source.userId;
  const now = new Date().toISOString();

  if (parsed.type === 'HELP') {
    await lineClient.replyMessage({ replyToken: event.replyToken, messages: [buildHelpFlex()] });
    return;
  }

  if (parsed.type === 'LIST_TRIPS') {
    const allTrips = db.select().from(trips).where(eq(trips.groupId, groupId)).orderBy(desc(trips.id)).all();
    if (allTrips.length === 0) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'กลุ่มนี้ยังไม่มีทริปเลย พิมพ์ /สร้างทริป <ชื่อทริป> เพื่อเริ่มต้นครับ' }],
      });
      return;
    }
    const grp = db.select().from(groups).where(eq(groups.groupId, groupId)).get();
    const enriched = allTrips.map((t) => {
      const m = db.select().from(tripMembers).where(eq(tripMembers.tripId, t.id)).all();
      const b = db.select().from(bills).where(eq(bills.tripId, t.id)).all();
      return {
        id: t.id,
        name: t.name,
        status: t.status,
        lockedStartDate: t.lockedStartDate,
        lockedEndDate: t.lockedEndDate,
        memberCount: m.length,
        billCount: b.length,
        totalSpend: b.reduce((s, x) => s + x.totalAmount, 0),
      };
    });
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [buildTripListFlex({ activeTripId: grp?.activeTripId ?? null, trips: enriched })],
    });
    return;
  }

  if (parsed.type === 'CREATE_TRIP') {
    const trip = db
      .insert(trips)
      .values({
        groupId,
        name: parsed.name,
        status: 'PLANNING',
        createdByUserId: userId ?? null,
        createdAt: now,
      })
      .returning()
      .get();

    db.insert(groups)
      .values({ groupId, activeTripId: trip.id, createdAt: now })
      .onConflictDoUpdate({
        target: groups.groupId,
        set: { activeTripId: trip.id },
      })
      .run();

    if (userId) {
      await ensureMemberInTrip(trip.id, groupId, userId);
    }

    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: trip.status,
          members,
        }),
      ],
    });
    return;
  }

  const trip = getActiveTrip(groupId);
  if (!trip) {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'ยังไม่มีทริปที่ใช้งานอยู่ พิมพ์ /สร้างทริป <ชื่อทริป> หรือ /ทริป เพื่อเลือกทริปครับ' }],
    });
    return;
  }

  if (parsed.type === 'RENAME_TRIP') {
    db.update(trips).set({ name: parsed.name }).where(eq(trips.id, trip.id)).run();
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: parsed.name,
          status: trip.status,
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'START_TRIP') {
    db.update(trips).set({ status: 'LOCKED' }).where(eq(trips.id, trip.id)).run();
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: 'LOCKED',
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'CLOSE_TRIP') {
    const flex = closeTripAndBuildFlex(groupId, trip.id);
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (parsed.type === 'JOIN_TRIP' && userId) {
    await ensureMemberInTrip(trip.id, groupId, userId);
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: trip.status,
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'LIST_MEMBERS') {
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildMembersFlex({
          tripId: trip.id,
          tripName: trip.name,
          createdByUserId: trip.createdByUserId,
          members,
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'ADD_GUEST') {
    db.insert(tripMembers)
      .values({
        tripId: trip.id,
        lineUserId: null,
        displayName: parsed.name,
        isGuest: true,
        createdAt: now,
      })
      .run();
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: trip.status,
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'CREATE_POLL') {
    const poll = db
      .insert(datePolls)
      .values({
        tripId: trip.id,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        durationDays: parsed.durationDays,
        createdAt: now,
      })
      .returning()
      .get();

    const flex = buildPollFlexForId(poll.id, 'FREE');
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (parsed.type === 'VIEW_AVAILABILITY') {
    const poll = db
      .select()
      .from(datePolls)
      .where(eq(datePolls.tripId, trip.id))
      .orderBy(desc(datePolls.id))
      .get();
    if (!poll) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'ยังไม่มีโพลวันว่าง พิมพ์ /นัด 1-15 ธ.ค. 3วัน ก่อนครับ' }],
      });
      return;
    }
    const flex = buildPollFlexForId(poll.id, 'FREE');
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (parsed.type === 'REMIND_FRIENDS') {
    const poll = db
      .select()
      .from(datePolls)
      .where(eq(datePolls.tripId, trip.id))
      .orderBy(desc(datePolls.id))
      .get();
    if (!poll) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'ยังไม่มีโพลวันว่างในทริปนี้ครับ' }],
      });
      return;
    }
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    const rows = db.select().from(availabilities).where(eq(availabilities.pollId, poll.id)).all();
    const respondedIds = new Set(rows.map((r) => r.memberId));
    const pending = members.filter((m) => !m.isGuest && !respondedIds.has(m.id));
    const msg =
      pending.length === 0
        ? 'สมาชิกในกลุ่มตอบวันว่างครบทุกคนแล้วครับ!'
        : `ยังรอคำตอบวันว่างจาก: ${pending.map((m) => m.displayName).join(', ')}`;
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: msg }],
    });
    return;
  }

  if (parsed.type === 'SET_AVAILABILITY' && userId) {
    const member = await ensureMemberInTrip(trip.id, groupId, userId);
    const poll = db
      .select()
      .from(datePolls)
      .where(eq(datePolls.tripId, trip.id))
      .orderBy(desc(datePolls.id))
      .get();

    if (!poll) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'ยังไม่มีโพลวันว่าง พิมพ์ /นัด 1-15 ธ.ค. 3วัน ก่อนครับ' }],
      });
      return;
    }

    for (const d of parsed.dates) {
      upsertAvailability(poll.id, member.id, d, parsed.status);
    }

    const flex = buildPollFlexForId(poll.id, parsed.status);
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (parsed.type === 'SET_GUEST_AVAILABILITY' && userId) {
    if (trip.createdByUserId && trip.createdByUserId !== userId) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'เฉพาะเจ้าของทริปเท่านั้นที่ลงวันแทน Guest ได้ครับ' }],
      });
      return;
    }

    const poll = db
      .select()
      .from(datePolls)
      .where(eq(datePolls.tripId, trip.id))
      .orderBy(desc(datePolls.id))
      .get();
    if (!poll) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: 'ยังไม่มีโพลวันว่าง พิมพ์ /นัด 1-15 ธ.ค. 3วัน ก่อนครับ' }],
      });
      return;
    }

    const guest = db
      .select()
      .from(tripMembers)
      .where(and(eq(tripMembers.tripId, trip.id), eq(tripMembers.isGuest, true)))
      .all()
      .find((m) => m.displayName.includes(parsed.guestName));

    if (!guest) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: `ไม่พบ Guest ชื่อ "${parsed.guestName}" ในทริปนี้ครับ` }],
      });
      return;
    }

    for (const d of parsed.dates) {
      upsertAvailability(poll.id, guest.id, d, parsed.status);
    }

    const flex = buildPollFlexForId(poll.id, parsed.status);
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if ((parsed.type === 'QUICK_SPLIT' || parsed.type === 'ITEMIZED_SPLIT') && userId) {
    if (trip.status === 'PLANNING') {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: 'text',
            text: `ทริป "${trip.name}" ยังไม่ได้ล็อกวัน/เริ่มทริปเลยครับ กรุณาล็อกวันจากการหาวันว่าง หรือพิมพ์ /เริ่มทริป ก่อนจดบิลครับ`,
          },
        ],
      });
      return;
    }
    if (trip.status === 'COMPLETED') {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: `ทริป "${trip.name}" ปิดทริปไปแล้วครับ พิมพ์ /สร้างทริป เพื่อเริ่มทริปใหม่ได้เลย` }],
      });
      return;
    }

    const payer = await ensureMemberInTrip(trip.id, groupId, userId);
    const allMembers = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    const resolveNames = (names: string[]) =>
      names.length === 0
        ? allMembers.map((m) => m.id)
        : allMembers.filter((m) => names.some((n) => m.displayName.includes(n))).map((m) => m.id);

    let items: Array<{
      name: string;
      amount: number;
      isAddon: boolean;
      participantIds: number[];
      exactAmounts?: Record<number, number>;
    }> = [];
    let splitMode = 'EQUAL';

    if (parsed.type === 'ITEMIZED_SPLIT') {
      splitMode = 'ITEMIZED';
      items = parsed.items.map((it) => ({
        name: it.name,
        amount: it.amount,
        isAddon: false,
        participantIds: resolveNames(it.mentions),
      }));
    } else if (Object.keys(parsed.exactShares).length > 0) {
      splitMode = 'EXACT';
      const exactAmounts: Record<number, number> = {};
      const participantIds: number[] = [];
      for (const [name, amt] of Object.entries(parsed.exactShares)) {
        const matched = allMembers.find((m) => m.displayName.includes(name));
        if (matched) {
          exactAmounts[matched.id] = amt;
          participantIds.push(matched.id);
        }
      }
      items = [
        {
          name: parsed.title,
          amount: parsed.baseAmount,
          isAddon: false,
          participantIds,
          exactAmounts,
        },
      ];
    } else {
      splitMode = parsed.addons.length > 0 ? 'BASE_ADDON' : 'EQUAL';
      items = [
        {
          name: parsed.title,
          amount: parsed.baseAmount,
          isAddon: false,
          participantIds: resolveNames(parsed.baseMentions),
        },
        ...parsed.addons.map((a) => ({
          name: a.name,
          amount: a.amount,
          isAddon: true,
          participantIds: resolveNames(a.mentions),
        })),
      ];
    }

    const calc = calculateBill({
      items,
      vatPercent: parsed.vatPercent,
      serviceChargePercent: parsed.serviceChargePercent,
      discountAmount: parsed.discountAmount,
    });

    const bill = db
      .insert(bills)
      .values({
        tripId: trip.id,
        title: parsed.title,
        payerMemberId: payer.id,
        splitMode,
        vatPercent: parsed.vatPercent,
        serviceChargePercent: parsed.serviceChargePercent,
        discountAmount: parsed.discountAmount,
        totalAmount: calc.grandTotal,
        createdAt: now,
      })
      .returning()
      .get();

    for (const item of items) {
      const bi = db
        .insert(billItems)
        .values({ billId: bill.id, name: item.name, amount: item.amount, isAddon: Boolean(item.isAddon) })
        .returning()
        .get();
      for (const mId of item.participantIds) {
        db.insert(billItemShares)
          .values({
            billItemId: bi.id,
            memberId: mId,
            exactAmount: item.exactAmounts ? item.exactAmounts[mId] : null,
            weight: 1,
          })
          .run();
      }
    }

    const memberMap = new Map(allMembers.map((m) => [m.id, m.displayName]));
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildBillReceiptFlex({
          billId: bill.id,
          title: bill.title,
          payerName: payer.displayName,
          grandTotal: calc.grandTotal,
          vatPercent: parsed.vatPercent,
          serviceChargePercent: parsed.serviceChargePercent,
          shares: calc.shares.map((s) => ({
            displayName: memberMap.get(s.memberId) || 'สมาชิก',
            netTotal: s.netTotal,
          })),
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'OPEN_BILL_BUILDER' || parsed.type === 'LIST_BILLS') {
    const tripBills = db.select().from(bills).where(eq(bills.tripId, trip.id)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildBillMenuFlex({
          tripName: trip.name,
          tripStatus: trip.status,
          bills: tripBills.map((b) => ({
            id: b.id,
            title: b.title,
            totalAmount: b.totalAmount,
            splitMode: b.splitMode,
          })),
        }),
      ],
    });
    return;
  }

  if (parsed.type === 'SETTLE_SUMMARY') {
    const flex = syncAndBuildSettlementFlex(trip.id, trip.name);
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [flex],
    });
  }
}

async function handlePostback(
  event: Extract<WebhookEvent, { type: 'postback' }>,
  groupId: string,
) {
  const params = new URLSearchParams(event.postback.data);
  const action = params.get('action');
  const userId = event.source.userId;

  if (action === 'join_trip' && userId) {
    const tripId = Number(params.get('tripId'));
    await ensureMemberInTrip(tripId, groupId, userId);
    const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
    if (!trip) return;
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: trip.status,
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (action === 'start_trip_now') {
    const tripId = Number(params.get('tripId'));
    db.update(trips).set({ status: 'LOCKED' }).where(eq(trips.id, tripId)).run();
    const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
    if (!trip) return;
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: trip.status,
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (action === 'switch_trip') {
    const tripId = Number(params.get('tripId'));
    db.update(groups).set({ activeTripId: tripId }).where(eq(groups.groupId, groupId)).run();
    const trip = db.select().from(trips).where(eq(trips.id, tripId)).get();
    if (!trip) return;
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, tripId)).all();
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildTripCreatedFlex({
          tripId: trip.id,
          tripName: trip.name,
          status: trip.status,
          lockedStartDate: trip.lockedStartDate,
          lockedEndDate: trip.lockedEndDate,
          members,
        }),
      ],
    });
    return;
  }

  if (action === 'close_trip') {
    const tripId = Number(params.get('tripId'));
    const flex = closeTripAndBuildFlex(groupId, tripId);
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (action === 'cal_mode') {
    const pollId = Number(params.get('pollId'));
    const mode = (params.get('mode') || 'FREE') as 'FREE' | 'MAYBE' | 'BUSY';
    const flex = buildPollFlexForId(pollId, mode);
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (action === 'toggle_day' && userId) {
    const pollId = Number(params.get('pollId'));
    const date = params.get('date');
    const mode = (params.get('mode') || 'FREE') as 'FREE' | 'MAYBE' | 'BUSY';
    const poll = db.select().from(datePolls).where(eq(datePolls.id, pollId)).get();
    if (!poll || !date) return;

    const member = await ensureMemberInTrip(poll.tripId, groupId, userId);
    upsertAvailability(poll.id, member.id, date, mode);

    const flex = buildPollFlexForId(poll.id, mode);
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (action === 'all_free' && userId) {
    const pollId = Number(params.get('pollId'));
    const poll = db.select().from(datePolls).where(eq(datePolls.id, pollId)).get();
    if (!poll) return;
    const member = await ensureMemberInTrip(poll.tripId, groupId, userId);
    for (const d of enumerateDates(poll.startDate, poll.endDate)) {
      upsertAvailability(poll.id, member.id, d, 'FREE');
    }
    const flex = buildPollFlexForId(poll.id, 'FREE');
    if (flex) {
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
    return;
  }

  if (action === 'lock_date') {
    const pollId = Number(params.get('pollId'));
    const start = params.get('start');
    const end = params.get('end');
    const poll = db.select().from(datePolls).where(eq(datePolls.id, pollId)).get();
    if (!poll || !start || !end) return;

    db.update(trips)
      .set({ status: 'LOCKED', lockedStartDate: start, lockedEndDate: end })
      .where(eq(trips.id, poll.tripId))
      .run();

    const trip = db.select().from(trips).where(eq(trips.id, poll.tripId)).get();
    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, poll.tripId)).all();
    if (trip) {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          buildTripCreatedFlex({
            tripId: trip.id,
            tripName: trip.name,
            status: trip.status,
            lockedStartDate: trip.lockedStartDate,
            lockedEndDate: trip.lockedEndDate,
            members,
          }),
        ],
      });
    }
    return;
  }

  if (action === 'toggle_settlement') {
    const settlementId = Number(params.get('settlementId'));
    const row = db.select().from(settlements).where(eq(settlements.id, settlementId)).get();
    if (!row) return;
    const nextStatus =
      row.status === 'PENDING'
        ? 'WAITING_CONFIRM'
        : row.status === 'WAITING_CONFIRM'
          ? 'CONFIRMED'
          : 'PENDING';

    db.update(settlements)
      .set({ status: nextStatus, updatedAt: new Date().toISOString() })
      .where(eq(settlements.id, settlementId))
      .run();

    const trip = db.select().from(trips).where(eq(trips.id, row.tripId)).get();
    if (trip) {
      const flex = syncAndBuildSettlementFlex(trip.id, trip.name);
      await lineClient.replyMessage({ replyToken: event.replyToken, messages: [flex] });
    }
  }
}

async function runDueTripReminders() {
  const todayIso = getBangkokDateIso();
  const lockedTrips = db.select().from(trips).where(eq(trips.status, 'LOCKED')).all();
  let sentCount = 0;

  for (const trip of lockedTrips) {
    if (!trip.lockedStartDate || !trip.groupId) continue;
    const key = getDueReminderKey(trip.lockedStartDate, todayIso);
    if (!key) continue;

    const alreadySent = db
      .select()
      .from(tripReminders)
      .where(and(eq(tripReminders.tripId, trip.id), eq(tripReminders.reminderKey, key)))
      .get();
    if (alreadySent) continue;

    const text = buildReminderText(trip.name, trip.lockedStartDate, trip.lockedEndDate, key);
    try {
      await lineClient.pushMessage({ to: trip.groupId, messages: [{ type: 'text', text }] });
      db.insert(tripReminders)
        .values({ tripId: trip.id, reminderKey: key, sentAt: new Date().toISOString() })
        .run();
      sentCount++;
    } catch (err) {
      app.log.error(err, `Failed to send ${key} reminder for trip ${trip.id}`);
    }
  }

  return { todayIso, sentCount };
}

app.get('/cron/reminders', async () => {
  return runDueTripReminders();
});

// Check every 1 hour while server is awake
setInterval(() => {
  runDueTripReminders().catch((err) => app.log.error(err, 'Reminder interval error'));
}, 60 * 60 * 1000);

app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

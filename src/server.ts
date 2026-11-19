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
} from './db/schema.js';
import { parseCommand } from './core/commandParser.js';
import { enumerateDates, rankDateWindows } from './core/dateMatcher.js';
import { calculateBill } from './core/billCalculator.js';
import { calculateSettlements } from './core/settlementEngine.js';
import { buildWelcomeFlex, buildTripCreatedFlex } from './flex/tripFlex.js';
import { buildCalendarPollFlex } from './flex/calendarFlex.js';
import { buildBillReceiptFlex } from './flex/billFlex.js';
import { buildSettlementFlex } from './flex/settlementFlex.js';
import { buildHelpFlex } from './flex/helpFlex.js';

const PORT = Number(process.env.PORT || 3000);
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

const { db } = createDb();
const lineClient = new messagingApi.MessagingApiClient({
  channelAccessToken: CHANNEL_ACCESS_TOKEN,
});

const app = Fastify({ logger: true });

// Serve static icon assets if present
const publicDir = path.resolve('public');
if (fs.existsSync(publicDir)) {
  await app.register(fastifyStatic, { root: publicDir, prefix: '/' });
}

// Preserve raw body for LINE signature verification
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    (req as unknown as { rawBody: string }).rawBody = body as string;
    done(null, JSON.parse(body as string));
  } catch (err) {
    done(err as Error, undefined);
  }
});

function verifyLineSignature(rawBody: string, signature: string | undefined): boolean {
  if (!CHANNEL_SECRET) return true; // allow local test if secret not set
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

async function ensureUserProfileName(groupId: string, userId: string): Promise<string> {
  try {
    const profile = await lineClient.getGroupMemberProfile(groupId, userId);
    return profile.displayName;
  } catch {
    return `เพื่อน-${userId.slice(-4)}`;
  }
}

async function ensureMemberInTrip(tripId: number, groupId: string, userId: string) {
  const existing = db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.tripId, tripId), eq(tripMembers.lineUserId, userId)))
    .get();
  if (existing) return existing;

  const displayName = await ensureUserProfileName(groupId, userId);
  return db
    .insert(tripMembers)
    .values({
      tripId,
      lineUserId: userId,
      displayName,
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
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [buildHelpFlex()],
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
      messages: [buildTripCreatedFlex({ tripId: trip.id, tripName: trip.name, members })],
    });
    return;
  }

  const trip = getActiveTrip(groupId);
  if (!trip) {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: 'ยังไม่มีทริปที่ใช้งานอยู่ พิมพ์ /สร้างทริป <ชื่อทริป> เพื่อเริ่มต้นครับ' }],
    });
    return;
  }

  if (parsed.type === 'JOIN_TRIP' && userId) {
    const member = await ensureMemberInTrip(trip.id, groupId, userId);
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `${member.displayName} เข้าร่วมทริป "${trip.name}" เรียบร้อย` }],
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
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `เพิ่ม Guest "${parsed.name}" เข้าทริป "${trip.name}" แล้ว` }],
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

    const members = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    const topWindows = rankDateWindows({
      startDate: poll.startDate,
      endDate: poll.endDate,
      durationDays: poll.durationDays,
      memberIds: members.map((m) => m.id),
      records: [],
    });

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildCalendarPollFlex({
          pollId: poll.id,
          tripName: trip.name,
          startDate: poll.startDate,
          endDate: poll.endDate,
          durationDays: poll.durationDays,
          respondedCount: 0,
          totalMembers: members.length,
          topWindows,
        }),
      ],
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
      db.insert(availabilities)
        .values({ pollId: poll.id, memberId: member.id, date: d, status: parsed.status, updatedAt: now })
        .run();
    }

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `บันทึกสถานะวันของ ${member.displayName} (${parsed.dates.length} วัน) เรียบร้อย` }],
    });
    return;
  }

  if (parsed.type === 'QUICK_SPLIT' && userId) {
    const payer = await ensureMemberInTrip(trip.id, groupId, userId);
    const allMembers = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    const resolveNames = (names: string[]) =>
      names.length === 0
        ? allMembers.map((m) => m.id)
        : allMembers.filter((m) => names.some((n) => m.displayName.includes(n))).map((m) => m.id);

    const items = [
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
        splitMode: parsed.addons.length > 0 ? 'BASE_ADDON' : 'EQUAL',
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
        db.insert(billItemShares).values({ billItemId: bi.id, memberId: mId, weight: 1 }).run();
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

  if (parsed.type === 'SETTLE_SUMMARY') {
    const tripBills = db.select().from(bills).where(eq(bills.tripId, trip.id)).all();
    const allMembers = db.select().from(tripMembers).where(eq(tripMembers.tripId, trip.id)).all();
    const memberMap = new Map(allMembers.map((m) => [m.id, m.displayName]));

    const summaries = tripBills.map((b) => {
      const items = db.select().from(billItems).where(eq(billItems.billId, b.id)).all();
      const calcItems = items.map((it) => {
        const shares = db.select().from(billItemShares).where(eq(billItemShares.billItemId, it.id)).all();
        return {
          name: it.name,
          amount: it.amount,
          isAddon: it.isAddon,
          participantIds: shares.map((s) => s.memberId),
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
    const createdSettlements = res.transfers.map((t) =>
      db
        .insert(settlements)
        .values({
          tripId: trip.id,
          fromMemberId: t.fromMemberId,
          toMemberId: t.toMemberId,
          amount: t.amount,
          status: 'PENDING',
          updatedAt: now,
        })
        .returning()
        .get(),
    );

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        buildSettlementFlex({
          tripName: trip.name,
          transfers: createdSettlements.map((s) => ({
            settlementId: s.id,
            fromName: memberMap.get(s.fromMemberId) || 'เพื่อน',
            toName: memberMap.get(s.toMemberId) || 'เพื่อน',
            amount: s.amount,
            status: s.status,
          })),
        }),
      ],
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
  const now = new Date().toISOString();

  if (action === 'join_trip' && userId) {
    const tripId = Number(params.get('tripId'));
    const member = await ensureMemberInTrip(tripId, groupId, userId);
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `${member.displayName} เข้าร่วมทริปเรียบร้อย!` }],
    });
    return;
  }

  if (action === 'all_free' && userId) {
    const pollId = Number(params.get('pollId'));
    const poll = db.select().from(datePolls).where(eq(datePolls.id, pollId)).get();
    if (!poll) return;
    const member = await ensureMemberInTrip(poll.tripId, groupId, userId);
    for (const d of enumerateDates(poll.startDate, poll.endDate)) {
      db.insert(availabilities)
        .values({ pollId: poll.id, memberId: member.id, date: d, status: 'FREE', updatedAt: now })
        .run();
    }
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `${member.displayName} ลงว่าว่างทุกวัน (${poll.startDate} ถึง ${poll.endDate}) แล้ว` }],
    });
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

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `ล็อกวันเดินทางเรียบร้อย: ${start} ถึง ${end}` }],
    });
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
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(settlements.id, settlementId))
      .run();

    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [{ type: 'text', text: `อัปเดตสถานะการโอน #${settlementId} เป็น ${nextStatus}` }],
    });
  }
}

app.listen({ port: PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});

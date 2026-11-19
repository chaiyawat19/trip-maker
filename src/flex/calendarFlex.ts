import type { messagingApi } from '@line/bot-sdk';
import { THEME, GRADIENT_HEADER, pillBadge, sectionTitle, progressBar } from './theme.js';
import {
  enumerateDates,
  findMutualFreeStreaks,
  formatThaiRange,
  type AvailabilityRecord,
  type MutualFreeStreak,
  type WindowMatch,
} from '../core/dateMatcher.js';

function compressDayNumbers(days: number[]): string {
  if (days.length === 0) return '-';
  const sorted = [...days].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return ranges.join(', ');
}

export function buildCalendarPollFlex(params: {
  pollId: number;
  tripName: string;
  tripStatus?: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  respondedCount: number;
  members: Array<{ id: number; displayName: string }>;
  activeMode?: 'FREE' | 'MAYBE' | 'BUSY';
  records: AvailabilityRecord[];
  topWindows: WindowMatch[];
}): messagingApi.FlexMessage {
  const isClosed = params.tripStatus === 'COMPLETED';
  const allDates = enumerateDates(params.startDate, params.endDate);
  const totalMembers = params.members.length;

  const dayMap = new Map<string, { free: number; maybe: number; busy: number }>();
  for (const r of params.records) {
    const entry = dayMap.get(r.date) ?? { free: 0, maybe: 0, busy: 0 };
    if (r.status === 'FREE') entry.free++;
    else if (r.status === 'MAYBE') entry.maybe++;
    else if (r.status === 'BUSY') entry.busy++;
    dayMap.set(r.date, entry);
  }

  function cellColors(date: string): { bg: string; fg: string; sub: string; border: string } {
    const counts = dayMap.get(date);
    if (!counts) return { bg: THEME.surface, fg: THEME.textSecondary, sub: '-', border: THEME.border };
    const sub = `${counts.free}/${totalMembers}`;
    if (totalMembers > 0 && counts.free === totalMembers) {
      return { bg: THEME.primary, fg: THEME.surface, sub, border: THEME.primary };
    }
    if (counts.busy > 0) return { bg: THEME.busyBg, fg: THEME.busyText, sub, border: THEME.busyBg };
    if (counts.maybe > 0) return { bg: THEME.maybeBg, fg: THEME.maybeText, sub, border: THEME.maybeBg };
    return { bg: THEME.freeBg, fg: THEME.freeText, sub, border: THEME.freeBg };
  }

  // Build 7-column calendar rows (Mon=0 .. Sun=6)
  const firstDate = new Date(`${params.startDate}T00:00:00Z`);
  const mondayOffset = (firstDate.getUTCDay() + 6) % 7;

  const cells: messagingApi.FlexBox[] = [];
  for (let i = 0; i < mondayOffset; i++) {
    cells.push({ type: 'box', layout: 'vertical', flex: 1, contents: [] });
  }
  for (const d of allDates) {
    const dayNum = String(Number(d.slice(8, 10)));
    const { bg, fg, sub, border } = cellColors(d);
    cells.push({
      type: 'box',
      layout: 'vertical',
      flex: 1,
      backgroundColor: bg,
      borderWidth: '1px',
      borderColor: border,
      cornerRadius: '10px',
      paddingTop: '5px',
      paddingBottom: '5px',
      alignItems: 'center',
      justifyContent: 'center',
      contents: [
        { type: 'text', text: dayNum, size: 'xs', color: fg, align: 'center' },
        { type: 'text', text: sub, size: 'xxs', color: fg, align: 'center' },
      ],
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ type: 'box', layout: 'vertical', flex: 1, contents: [] });
  }

  const weekRows: messagingApi.FlexBox[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weekRows.push({
      type: 'box',
      layout: 'horizontal',
      spacing: 'xs',
      contents: cells.slice(i, i + 7),
    });
  }

  const weekdayHeader: messagingApi.FlexBox = {
    type: 'box',
    layout: 'horizontal',
    spacing: 'xs',
    contents: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((w) => ({
      type: 'text',
      text: w,
      size: 'xxs',
      color: THEME.textSecondary,
      align: 'center',
      flex: 1,
    })),
  };

  // Per-member availability breakdown
  const initialBadge = (name: string, responded: boolean): messagingApi.FlexBox => ({
    type: 'box',
    layout: 'vertical',
    width: '24px',
    height: '24px',
    cornerRadius: '12px',
    backgroundColor: responded ? THEME.lavenderHaze : THEME.lavenderTint,
    justifyContent: 'center',
    alignItems: 'center',
    contents: [{ type: 'text', text: (name || '?').slice(0, 1), size: 'xxs', color: responded ? THEME.velvetGrape : THEME.textSecondary, align: 'center' }],
  });

  const memberRows: messagingApi.FlexBox[] = params.members.map((member) => {
    const myRecords = params.records.filter((r) => r.memberId === member.id);
    if (myRecords.length === 0) {
      return {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        alignItems: 'center',
        contents: [
          initialBadge(member.displayName, false),
          { type: 'text', text: member.displayName, size: 'xs', color: THEME.textSecondary, flex: 3, maxLines: 1 },
          pillBadge('ยังไม่ตอบ', THEME.lavenderTint, THEME.textSecondary),
        ],
      };
    }

    const freeDays = myRecords.filter((r) => r.status === 'FREE').map((r) => Number(r.date.slice(8, 10)));
    const maybeDays = myRecords.filter((r) => r.status === 'MAYBE').map((r) => Number(r.date.slice(8, 10)));
    const busyDays = myRecords.filter((r) => r.status === 'BUSY').map((r) => Number(r.date.slice(8, 10)));

    const detail: messagingApi.FlexComponent[] = [];
    if (freeDays.length > 0) detail.push({ type: 'text', text: `ว่าง ${compressDayNumbers(freeDays)}`, size: 'xxs', color: THEME.freeText, wrap: true });
    if (maybeDays.length > 0) detail.push({ type: 'text', text: `อาจจะ ${compressDayNumbers(maybeDays)}`, size: 'xxs', color: THEME.maybeText, wrap: true });
    if (busyDays.length > 0) detail.push({ type: 'text', text: `ไม่ว่าง ${compressDayNumbers(busyDays)}`, size: 'xxs', color: THEME.busyText, wrap: true });

    return {
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      alignItems: 'center',
      contents: [
        initialBadge(member.displayName, true),
        { type: 'text', text: member.displayName, size: 'xs', color: THEME.velvetGrape, flex: 3, maxLines: 1 },
        { type: 'box', layout: 'vertical', flex: 5, contents: detail },
      ],
    };
  });

  const memberNameMap = new Map(params.members.map((m) => [m.id, m.displayName]));
  const mutualStreaks: MutualFreeStreak[] = findMutualFreeStreaks({
    startDate: params.startDate,
    endDate: params.endDate,
    memberIds: params.members.map((m) => m.id),
    records: params.records,
  });
  const best = params.topWindows[0];
  const pollRangeText = formatThaiRange(params.startDate, params.endDate, params.durationDays);
  const respondedPct = totalMembers > 0 ? (params.respondedCount / totalMembers) * 100 : 0;

  const recommendSection: messagingApi.FlexComponent[] = [];
  if (mutualStreaks.length > 0) {
    recommendSection.push(sectionTitle('ทุกคนว่างตรงกัน', `${mutualStreaks.length} ช่วง`));
    for (const streak of mutualStreaks) {
      recommendSection.push({
        type: 'box',
        layout: 'horizontal',
        alignItems: 'center',
        spacing: 'md',
        background: GRADIENT_HEADER,
        cornerRadius: '14px',
        paddingAll: '12px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            width: '44px',
            height: '44px',
            cornerRadius: '12px',
            backgroundColor: THEME.lavenderHaze,
            justifyContent: 'center',
            alignItems: 'center',
            contents: [
              { type: 'text', text: String(streak.daysCount), size: 'md', color: THEME.velvetGrape, align: 'center' },
              { type: 'text', text: 'วัน', size: 'xxs', color: THEME.velvetGrape, align: 'center' },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            contents: [
              { type: 'text', text: formatThaiRange(streak.startDate, streak.endDate), size: 'md', color: THEME.surface },
              { type: 'text', text: `ว่างครบ ${totalMembers} คน ติดกัน ${streak.daysCount} วัน`, size: 'xxs', color: THEME.lavenderHaze, wrap: true },
            ],
          },
        ],
      });
    }
    recommendSection.push({
      type: 'text',
      text: 'คุยกันในกลุ่มก่อน แล้วค่อยกดล็อกวันที่ตกลงกันได้เลย',
      size: 'xxs',
      color: THEME.textSecondary,
      wrap: true,
    });
  } else {
    const pending = params.members.filter((m) => !params.records.some((r) => r.memberId === m.id)).map((m) => m.displayName);
    const tips: messagingApi.FlexComponent[] = [
      { type: 'text', text: 'ยังไม่มีวันที่ทุกคนว่างตรงกัน', size: 'sm', color: THEME.velvetGrape, wrap: true },
    ];
    if (pending.length > 0) {
      tips.push({ type: 'text', text: `รอ ${pending.join(', ')} ลงวันว่าง`, size: 'xxs', color: THEME.textSecondary, wrap: true });
    }
    if (best) {
      const missingNames = [...best.busyMemberIds, ...best.pendingMemberIds]
        .map((id) => memberNameMap.get(id))
        .filter(Boolean);
      tips.push({
        type: 'text',
        text: `ใกล้เคียงสุด: ${formatThaiRange(best.startDate, best.endDate, params.durationDays)} (ว่าง ${best.freeMemberIds.length}/${totalMembers}${missingNames.length > 0 ? ` • ติด ${missingNames.join(', ')}` : ''})`,
        size: 'xxs',
        color: THEME.primary,
        wrap: true,
      });
    }
    recommendSection.push({
      type: 'box',
      layout: 'vertical',
      backgroundColor: THEME.lavenderTint,
      borderWidth: '1px',
      borderColor: THEME.border,
      cornerRadius: '14px',
      paddingAll: '12px',
      spacing: 'xs',
      contents: tips,
    });
  }

  const legendItem = (bg: string, label: string, border?: string): messagingApi.FlexBox => ({
    type: 'box',
    layout: 'horizontal',
    spacing: 'xs',
    alignItems: 'center',
    flex: 0,
    contents: [
      { type: 'box', layout: 'vertical', width: '10px', height: '10px', cornerRadius: '3px', backgroundColor: bg, borderWidth: border ? '1px' : '0px', borderColor: border ?? bg, contents: [] },
      { type: 'text', text: label, size: 'xxs', color: THEME.textSecondary, flex: 0 },
    ],
  });

  return {
    type: 'flex',
    altText: `นัดวันว่าง: ${params.tripName} (${pollRangeText})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        background: GRADIENT_HEADER,
        paddingAll: '20px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              pillBadge(isClosed ? 'ปิดทริปแล้ว' : 'นัดวันว่าง', THEME.lavenderHaze, THEME.velvetGrape),
              { type: 'text', text: pollRangeText, size: 'xs', color: THEME.lavenderHaze, align: 'end', flex: 1 },
            ],
          },
          {
            type: 'text',
            text: params.tripName,
            size: 'xl',
            color: THEME.surface,
            margin: 'lg',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            contents: [
              { type: 'text', text: 'ลงวันว่างแล้ว', size: 'xxs', color: THEME.lavenderHaze, flex: 1 },
              { type: 'text', text: `${params.respondedCount}/${totalMembers} คน`, size: 'xxs', color: THEME.surface, align: 'end' },
            ],
          },
          { ...progressBar(respondedPct), margin: 'sm' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          ...recommendSection,
          { type: 'separator', color: THEME.border, margin: 'md' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            margin: 'md',
            contents: [weekdayHeader, ...weekRows],
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            justifyContent: 'center',
            contents: [
              legendItem(THEME.primary, 'ว่างครบ'),
              legendItem(THEME.freeBg, 'ว่างบางคน'),
              legendItem(THEME.maybeBg, 'อาจจะ'),
              legendItem(THEME.busyBg, 'ไม่ว่าง'),
            ],
          },
          { type: 'separator', color: THEME.border, margin: 'md' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [sectionTitle('สถานะรายคน', `${params.respondedCount}/${totalMembers}`), ...memberRows],
          },
        ],
      },
      ...(isClosed
        ? {}
        : {
            footer: {
              type: 'box',
              layout: 'vertical',
              spacing: 'sm',
              paddingAll: '14px',
              paddingTop: '0px',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: THEME.primary,
                  height: 'md',
                  action: {
                    type: 'uri',
                    label: 'เลือกวันว่าง / ล็อกวันในเว็บ',
                    uri: `${(process.env.PUBLIC_BASE_URL || 'https://trip-maker.onrender.com').replace(/\/$/, '')}/pick?pollId=${params.pollId}`,
                  },
                },
                ...mutualStreaks.slice(0, 2).map((streak) => ({
                  type: 'button' as const,
                  style: 'secondary' as const,
                  color: THEME.lavenderHaze,
                  height: 'sm' as const,
                  action: {
                    type: 'postback' as const,
                    label: `ล็อกวัน ${formatThaiRange(streak.startDate, streak.endDate)}`,
                    data: `action=lock_date&pollId=${params.pollId}&start=${streak.startDate}&end=${streak.endDate}`,
                  },
                })),
              ],
            },
          }),
    },
  };
}

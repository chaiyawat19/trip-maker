import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';
import { enumerateDates, type AvailabilityRecord, type WindowMatch } from '../core/dateMatcher.js';

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
  startDate: string;
  endDate: string;
  durationDays: number;
  respondedCount: number;
  members: Array<{ id: number; displayName: string }>;
  activeMode?: 'FREE' | 'MAYBE' | 'BUSY';
  records: AvailabilityRecord[];
  topWindows: WindowMatch[];
}): messagingApi.FlexMessage {
  const mode = params.activeMode ?? 'FREE';
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

  function cellColors(date: string): { bg: string; fg: string; sub: string } {
    const counts = dayMap.get(date);
    if (!counts) return { bg: THEME.lavenderTint, fg: THEME.velvetGrape, sub: `0/${totalMembers}` };
    const sub = `${counts.free}/${totalMembers}`;
    if (counts.busy > 0) return { bg: THEME.busyBg, fg: THEME.busyText, sub };
    if (counts.maybe > 0) return { bg: THEME.maybeBg, fg: THEME.maybeText, sub };
    return { bg: THEME.freeBg, fg: THEME.freeText, sub };
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
    const { bg, fg, sub } = cellColors(d);
    cells.push({
      type: 'box',
      layout: 'vertical',
      flex: 1,
      backgroundColor: bg,
      cornerRadius: '8px',
      paddingTop: '4px',
      paddingBottom: '4px',
      alignItems: 'center',
      justifyContent: 'center',
      action: {
        type: 'postback',
        label: dayNum,
        data: `action=toggle_day&pollId=${params.pollId}&date=${d}&mode=${mode}`,
      },
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

  const modeSwitcher: messagingApi.FlexBox = {
    type: 'box',
    layout: 'horizontal',
    spacing: 'xs',
    backgroundColor: THEME.lavenderTint,
    cornerRadius: '10px',
    paddingAll: '4px',
    contents: (
      [
        { key: 'FREE', label: 'โหมด: ว่าง', color: THEME.freeText },
        { key: 'MAYBE', label: 'อาจจะ', color: THEME.maybeText },
        { key: 'BUSY', label: 'ไม่ว่าง', color: THEME.busyText },
      ] as const
    ).map((m) => ({
      type: 'box',
      layout: 'vertical',
      flex: 1,
      backgroundColor: mode === m.key ? THEME.surface : THEME.lavenderTint,
      cornerRadius: '8px',
      paddingTop: '6px',
      paddingBottom: '6px',
      alignItems: 'center',
      action: {
        type: 'postback',
        label: m.label,
        data: `action=cal_mode&pollId=${params.pollId}&mode=${m.key}`,
      },
      contents: [
        {
          type: 'text',
          text: m.label,
          size: 'xxs',
          color: mode === m.key ? m.color : THEME.textSecondary,
          align: 'center',
        },
      ],
    })),
  };

  // Per-member availability breakdown
  const memberRows: messagingApi.FlexBox[] = params.members.map((member) => {
    const myRecords = params.records.filter((r) => r.memberId === member.id);
    if (myRecords.length === 0) {
      return {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: member.displayName, size: 'xxs', color: THEME.velvetGrape, flex: 2 },
          { type: 'text', text: 'ยังไม่ตอบ', size: 'xxs', color: THEME.textSecondary, flex: 5, align: 'end' },
        ],
      };
    }

    const freeDays = myRecords.filter((r) => r.status === 'FREE').map((r) => Number(r.date.slice(8, 10)));
    const maybeDays = myRecords.filter((r) => r.status === 'MAYBE').map((r) => Number(r.date.slice(8, 10)));
    const busyDays = myRecords.filter((r) => r.status === 'BUSY').map((r) => Number(r.date.slice(8, 10)));

    const parts: string[] = [];
    if (freeDays.length > 0) parts.push(`ว่าง ${compressDayNumbers(freeDays)}`);
    if (maybeDays.length > 0) parts.push(`อาจจะ ${compressDayNumbers(maybeDays)}`);
    if (busyDays.length > 0) parts.push(`ไม่ว่าง ${compressDayNumbers(busyDays)}`);

    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: member.displayName, size: 'xxs', color: THEME.velvetGrape, flex: 2 },
        { type: 'text', text: parts.join(' | '), size: 'xxs', color: THEME.primary, flex: 5, align: 'end', wrap: true },
      ],
    };
  });

  const memberNameMap = new Map(params.members.map((m) => [m.id, m.displayName]));
  const best = params.topWindows[0];
  let bestLabel = `${params.startDate} ถึง ${params.endDate}`;
  if (best) {
    const missingNames = [...best.busyMemberIds, ...best.pendingMemberIds]
      .map((id) => memberNameMap.get(id))
      .filter(Boolean);
    const suffix = missingNames.length > 0 ? ` • ยังไม่ครบ: ${missingNames.join(', ')}` : ' • ครบทุกคน';
    bestLabel = `แนะนำ: ${best.startDate} ถึง ${best.endDate} (${best.freeMemberIds.length}/${totalMembers}${suffix})`;
  }

  return {
    type: 'flex',
    altText: `นัดวันว่าง: ${params.tripName} (${params.startDate} - ${params.endDate})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: THEME.lavenderTint,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: `${params.tripName} • ${params.durationDays} วันติดกัน`,
            size: 'xs',
            color: THEME.primary,
          },
          {
            type: 'text',
            text: `จิ้มเลือกวันที่ต้องการ (ตอบแล้ว ${params.respondedCount}/${totalMembers} คน)`,
            size: 'sm',
            color: THEME.velvetGrape,
            margin: 'xs',
            wrap: true,
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        contents: [
          weekdayHeader,
          ...weekRows,
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderTint,
            cornerRadius: '10px',
            paddingAll: '10px',
            spacing: 'xs',
            margin: 'sm',
            contents: [
              { type: 'text', text: 'สถานะรายคน', size: 'xxs', color: THEME.textSecondary },
              ...memberRows,
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderHaze,
            cornerRadius: '10px',
            paddingAll: '10px',
            contents: [
              {
                type: 'text',
                text: bestLabel,
                size: 'xs',
                color: THEME.velvetGrape,
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: THEME.primary,
            height: 'sm',
            action: {
              type: 'uri',
              label: 'เลือกวันว่าง (ไม่เด้งแชทรัว)',
              uri: `${(process.env.PUBLIC_BASE_URL || 'https://trip-maker.onrender.com').replace(/\/$/, '')}/pick?pollId=${params.pollId}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderTint,
            height: 'sm',
            action: {
              type: 'postback',
              label: 'ฉันว่างทุกวันในช่วงนี้',
              data: `action=all_free&pollId=${params.pollId}`,
            },
          },
          ...(best
            ? [
                {
                  type: 'button' as const,
                  style: 'secondary' as const,
                  color: THEME.lavenderHaze,
                  height: 'sm' as const,
                  action: {
                    type: 'postback' as const,
                    label: `ล็อกวันเริ่มทริป ${best.startDate}`,
                    data: `action=lock_date&pollId=${params.pollId}&start=${best.startDate}&end=${best.endDate}`,
                  },
                },
              ]
            : []),
        ],
      },
    },
  };
}

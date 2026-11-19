import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';
import { enumerateDates, type AvailabilityRecord, type WindowMatch } from '../core/dateMatcher.js';

export function buildCalendarPollFlex(params: {
  pollId: number;
  tripName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  respondedCount: number;
  totalMembers: number;
  activeMode?: 'FREE' | 'MAYBE' | 'BUSY';
  records: AvailabilityRecord[];
  topWindows: WindowMatch[];
}): messagingApi.FlexMessage {
  const mode = params.activeMode ?? 'FREE';
  const allDates = enumerateDates(params.startDate, params.endDate);

  // Compute per-day heat map color from all records
  const dayRecords = new Map<string, Array<'FREE' | 'MAYBE' | 'BUSY'>>();
  for (const r of params.records) {
    const arr = dayRecords.get(r.date) ?? [];
    arr.push(r.status);
    dayRecords.set(r.date, arr);
  }

  function cellColors(date: string): { bg: string; fg: string } {
    const statuses = dayRecords.get(date) ?? [];
    if (statuses.length === 0) return { bg: THEME.lavenderTint, fg: THEME.velvetGrape };
    if (statuses.includes('BUSY')) return { bg: THEME.busyBg, fg: THEME.busyText };
    if (statuses.includes('MAYBE')) return { bg: THEME.maybeBg, fg: THEME.maybeText };
    return { bg: THEME.freeBg, fg: THEME.freeText };
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
    const { bg, fg } = cellColors(d);
    cells.push({
      type: 'box',
      layout: 'vertical',
      flex: 1,
      backgroundColor: bg,
      cornerRadius: '8px',
      paddingTop: '6px',
      paddingBottom: '6px',
      alignItems: 'center',
      justifyContent: 'center',
      action: {
        type: 'postback',
        label: dayNum,
        data: `action=toggle_day&pollId=${params.pollId}&date=${d}&mode=${mode}`,
      },
      contents: [{ type: 'text', text: dayNum, size: 'xs', color: fg, align: 'center' }],
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

  const best = params.topWindows[0];
  const bestLabel = best
    ? `แนะนำ: ${best.startDate} ถึง ${best.endDate} (ว่าง ${best.freeMemberIds.length}/${params.totalMembers} คน)`
    : `${params.startDate} ถึง ${params.endDate}`;

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
            text: `จิ้มเลือกวันที่ต้องการ (ตอบแล้ว ${params.respondedCount}/${params.totalMembers} คน)`,
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
          modeSwitcher,
          weekdayHeader,
          ...weekRows,
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderTint,
            cornerRadius: '10px',
            paddingAll: '10px',
            margin: 'sm',
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

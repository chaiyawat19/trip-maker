import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';
import type { WindowMatch } from '../core/dateMatcher.js';

export function buildCalendarPollFlex(params: {
  pollId: number;
  tripName: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  respondedCount: number;
  totalMembers: number;
  topWindows: WindowMatch[];
}): messagingApi.FlexMessage {
  const best = params.topWindows[0];
  const bestLabel = best
    ? `${best.startDate} ถึง ${best.endDate} (ว่าง ${best.freeMemberIds.length}/${params.totalMembers})`
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
            text: `${params.startDate} ถึง ${params.endDate}`,
            size: 'md',
            color: THEME.velvetGrape,
            margin: 'xs',
          },
          {
            type: 'text',
            text: `ตอบแล้ว ${params.respondedCount}/${params.totalMembers} คน`,
            size: 'xxs',
            color: THEME.textSecondary,
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: 'ช่วงวันที่ดีที่สุดตอนนี้',
            size: 'xs',
            color: THEME.textSecondary,
          },
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderTint,
            cornerRadius: '12px',
            paddingAll: '12px',
            contents: [
              {
                type: 'text',
                text: bestLabel,
                size: 'sm',
                color: THEME.velvetGrape,
                wrap: true,
              },
            ],
          },
          {
            type: 'text',
            text: 'พิมพ์บอกวันได้เลย เช่น /ไม่ว่าง 5-7 ธ.ค. หรือกดปุ่มด้านล่าง',
            size: 'xxs',
            color: THEME.textSecondary,
            wrap: true,
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
                    label: `ล็อกวัน ${best.startDate}`,
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

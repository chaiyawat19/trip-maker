import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';
import { buildLiffBillsUrl } from '../core/promptpay.js';

export function buildSettlementFlex(params: {
  tripId: number;
  tripName: string;
  transfers: Array<{
    settlementId: number;
    fromName: string;
    toName: string;
    amount: number;
    status: string;
  }>;
}): messagingApi.FlexMessage {
  const confirmedCount = params.transfers.filter((t) => t.status === 'CONFIRMED').length;
  const allCleared = params.transfers.length > 0 && confirmedCount === params.transfers.length;

  const rows: messagingApi.FlexComponent[] =
    params.transfers.length === 0
      ? [{ type: 'text', text: 'ไม่มียอดค้างโอนในทริปนี้', size: 'sm', color: THEME.textSecondary }]
      : params.transfers.map((t) => ({
          type: 'box',
          layout: 'horizontal',
          alignItems: 'center',
          backgroundColor: t.status === 'CONFIRMED' ? THEME.freeBg : THEME.lavenderTint,
          cornerRadius: '12px',
          paddingAll: '10px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              flex: 1,
              contents: [
                { type: 'text', text: `${t.fromName} ไป ${t.toName}`, size: 'xs', color: THEME.textSecondary },
                {
                  type: 'text',
                  text: `${t.amount.toLocaleString()} ฿`,
                  size: 'md',
                  color: t.status === 'CONFIRMED' ? THEME.freeText : THEME.velvetGrape,
                },
              ],
            },
            {
              type: 'button',
              style: t.status === 'CONFIRMED' ? 'secondary' : 'primary',
              color:
                t.status === 'CONFIRMED'
                  ? THEME.freeBg
                  : t.status === 'WAITING_CONFIRM'
                    ? THEME.maybeText
                    : THEME.primary,
              height: 'sm',
              flex: 0,
              action: {
                type: 'postback',
                label:
                  t.status === 'CONFIRMED'
                    ? 'เคลียร์แล้ว'
                    : t.status === 'WAITING_CONFIRM'
                      ? 'ยืนยันรับ'
                      : 'โอนแล้ว',
                data: `action=toggle_settlement&settlementId=${t.settlementId}`,
              },
            },
          ],
        }));

  return {
    type: 'flex',
    altText: `สรุปยอดโอน ${params.tripName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: allCleared ? THEME.freeBg : THEME.lavenderTint,
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: allCleared ? `เคลียร์ยอดครบ 100% • ${params.tripName}` : `เคลียร์ยอด • ${params.tripName}`,
            size: 'xs',
            color: allCleared ? THEME.freeText : THEME.primary,
          },
          {
            type: 'text',
            text: `รายการโอนเงินสุทธิ (${confirmedCount}/${params.transfers.length} เคลียร์แล้ว)`,
            size: 'md',
            color: THEME.velvetGrape,
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: rows,
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
              label: 'เปิดเว็บดู QR พร้อมเพย์ / จัดการบิล',
              uri: buildLiffBillsUrl(params.tripId),
            },
          },
          {
            type: 'button',
            style: allCleared ? 'primary' : 'secondary',
            color: allCleared ? THEME.freeText : THEME.lavenderHaze,
            height: 'sm',
            action: {
              type: 'postback',
              label: 'ปิดทริปนี้',
              data: `action=close_trip&tripId=${params.tripId}`,
            },
          },
        ],
      },
    },
  };
}

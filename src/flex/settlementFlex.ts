import type { messagingApi } from '@line/bot-sdk';
import { THEME, GRADIENT_HEADER, GRADIENT_SUCCESS, pillBadge } from './theme.js';
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
          borderWidth: '1px',
          borderColor: t.status === 'CONFIRMED' ? '#BBF7D0' : THEME.border,
          cornerRadius: '14px',
          paddingAll: '12px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              flex: 1,
              contents: [
                { type: 'text', text: `${t.fromName} โอนให้ ${t.toName}`, size: 'xs', color: THEME.textSecondary },
                {
                  type: 'text',
                  text: `${t.amount.toLocaleString()} ฿`,
                  size: 'lg',
                  color: t.status === 'CONFIRMED' ? THEME.freeText : THEME.velvetGrape,
                  margin: 'xs',
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
        background: allCleared ? GRADIENT_SUCCESS : GRADIENT_HEADER,
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              pillBadge(
                allCleared ? 'เคลียร์ครบ 100%' : `${confirmedCount}/${params.transfers.length} เคลียร์แล้ว`,
                allCleared ? THEME.freeBg : THEME.lavenderHaze,
                allCleared ? THEME.freeText : THEME.velvetGrape,
              ),
              { type: 'text', text: params.tripName, size: 'xs', color: THEME.surface, align: 'end', flex: 1 },
            ],
          },
          {
            type: 'text',
            text: 'รายการโอนเงินสุทธิ',
            size: 'lg',
            color: THEME.surface,
            margin: 'md',
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
            color: allCleared ? THEME.freeText : THEME.lavenderTint,
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

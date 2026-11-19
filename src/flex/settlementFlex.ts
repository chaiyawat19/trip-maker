import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

export function buildSettlementFlex(params: {
  tripName: string;
  transfers: Array<{
    settlementId: number;
    fromName: string;
    toName: string;
    amount: number;
    status: string;
  }>;
}): messagingApi.FlexMessage {
  const rows: messagingApi.FlexComponent[] =
    params.transfers.length === 0
      ? [{ type: 'text', text: 'ไม่มียอดค้างโอนในทริปนี้', size: 'sm', color: THEME.textSecondary }]
      : params.transfers.map((t) => ({
          type: 'box',
          layout: 'horizontal',
          alignItems: 'center',
          backgroundColor: THEME.lavenderTint,
          cornerRadius: '12px',
          paddingAll: '10px',
          contents: [
            {
              type: 'box',
              layout: 'vertical',
              flex: 1,
              contents: [
                { type: 'text', text: `${t.fromName} ไป ${t.toName}`, size: 'xs', color: THEME.textSecondary },
                { type: 'text', text: `${t.amount.toLocaleString()} ฿`, size: 'md', color: THEME.velvetGrape },
              ],
            },
            {
              type: 'button',
              style: t.status === 'CONFIRMED' ? 'secondary' : 'primary',
              color: t.status === 'CONFIRMED' ? THEME.freeBg : THEME.primary,
              height: 'sm',
              flex: 0,
              action: {
                type: 'postback',
                label: t.status === 'CONFIRMED' ? 'เคลียร์' : t.status === 'WAITING_CONFIRM' ? 'ยืนยันรับ' : 'โอนแล้ว',
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
        backgroundColor: THEME.lavenderTint,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: `เคลียร์ยอด • ${params.tripName}`, size: 'xs', color: THEME.primary },
          { type: 'text', text: `รายการโอนเงินสุทธิ (${params.transfers.length} รอบ)`, size: 'md', color: THEME.velvetGrape, margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: rows,
      },
    },
  };
}

import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

export function buildBillReceiptFlex(params: {
  billId: number;
  title: string;
  payerName: string;
  grandTotal: number;
  vatPercent: number;
  serviceChargePercent: number;
  shares: Array<{ displayName: string; netTotal: number }>;
}): messagingApi.FlexMessage {
  const shareRows: messagingApi.FlexBox[] = params.shares.map((s) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: s.displayName, size: 'xs', color: THEME.velvetGrape, flex: 1 },
      { type: 'text', text: `${s.netTotal.toLocaleString()} ฿`, size: 'xs', color: THEME.primary, align: 'end' },
    ],
  }));

  const tags: string[] = [];
  if (params.serviceChargePercent > 0) tags.push(`SC ${params.serviceChargePercent}%`);
  if (params.vatPercent > 0) tags.push(`VAT ${params.vatPercent}%`);

  return {
    type: 'flex',
    altText: `บิล ${params.title} ${params.grandTotal} บาท`,
    contents: {
      type: 'bubble',
      size: params.shares.length <= 4 && tags.length === 0 ? 'kilo' : 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: THEME.lavenderTint,
        paddingAll: '16px',
        contents: [
          ...(tags.length > 0
            ? [{ type: 'text' as const, text: tags.join(' • '), size: 'xxs' as const, color: THEME.primary }]
            : []),
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'xs',
            contents: [
              { type: 'text', text: params.title, size: 'md', color: THEME.velvetGrape, flex: 1, wrap: true },
              { type: 'text', text: `${params.grandTotal.toLocaleString()} ฿`, size: 'lg', color: THEME.primary, align: 'end' },
            ],
          },
          {
            type: 'text',
            text: `สำรองจ่ายโดย ${params.payerName}`,
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
          { type: 'text', text: 'สรุปยอดต่อคน', size: 'xxs', color: THEME.textSecondary },
          ...shareRows,
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderHaze,
            height: 'sm',
            action: { type: 'message', label: 'สรุปยอดทั้งทริป', text: '/สรุปเงิน' },
          },
        ],
      },
    },
  };
}

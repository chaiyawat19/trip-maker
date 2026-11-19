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
            action: { type: 'message', label: 'สรุปยอดทั้งทริป', text: '/สรุปยอด' },
          },
        ],
      },
    },
  };
}

export function buildBillMenuFlex(params: {
  tripName: string;
  tripStatus: string;
  bills: Array<{ id: number; title: string; totalAmount: number; splitMode: string }>;
}): messagingApi.FlexMessage {
  const totalSpend = params.bills.reduce((s, b) => s + b.totalAmount, 0);

  const billRows: messagingApi.FlexComponent[] =
    params.bills.length === 0
      ? [{ type: 'text', text: 'ยังไม่มีบิลในทริปนี้', size: 'xs', color: THEME.textSecondary }]
      : params.bills.slice(-8).map((b, idx) => ({
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: `${idx + 1}. ${b.title}`, size: 'xs', color: THEME.velvetGrape, flex: 3, wrap: true },
            { type: 'text', text: `${b.totalAmount.toLocaleString()} ฿`, size: 'xs', color: THEME.primary, flex: 1, align: 'end' },
          ],
        }));

  return {
    type: 'flex',
    altText: `บิลของทริป ${params.tripName} (${params.bills.length} บิล)`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: THEME.lavenderTint,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: `รายการบิล • ${params.tripName}`, size: 'xs', color: THEME.primary },
          {
            type: 'text',
            text: `รวม ${params.bills.length} บิล (${totalSpend.toLocaleString()} ฿)`,
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
        contents: [
          ...billRows,
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderTint,
            cornerRadius: '10px',
            paddingAll: '10px',
            margin: 'md',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'วิธีเพิ่มบิลใหม่ (เลือกพิมพ์ตามแบบที่ต้องการ)', size: 'xxs', color: THEME.primary },
              {
                type: 'text',
                text: '/หารรวม ค่าข้าว 1000\n/หารเพิ่ม ค่าข้าว 1200 +เบียร์ 400 @เอ @บี\n/หารแยก ปิ้งย่าง (แล้วขึ้นบรรทัดใหม่ใส่รายการ)\n/หารเอง ค่าน้ำมัน @เอ=500 @บี=300',
                size: 'xxs',
                color: THEME.velvetGrape,
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: THEME.primary,
            height: 'sm',
            action: { type: 'message', label: 'สรุปยอดโอน', text: '/สรุปยอด' },
          },
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderHaze,
            height: 'sm',
            action: { type: 'message', label: 'ดูวิธีใช้ละเอียด', text: '/วิธีใช้' },
          },
        ],
      },
    },
  };
}

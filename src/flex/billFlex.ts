import type { messagingApi } from '@line/bot-sdk';
import { THEME, GRADIENT_HEADER, pillBadge } from './theme.js';
import { buildLiffBillsUrl } from '../core/promptpay.js';

export function buildOpenBillsLiffFlex(params: {
  tripId: number;
  tripName: string;
  billCount: number;
  totalSpend: number;
}): messagingApi.FlexMessage {
  const liffUrl = buildLiffBillsUrl(params.tripId);
  return {
    type: 'flex',
    altText: `จัดการบิลและ QR พร้อมเพย์ • ${params.tripName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        background: GRADIENT_HEADER,
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              pillBadge('LIFF WEB APP', THEME.lavenderHaze, THEME.velvetGrape),
              { type: 'text', text: params.tripName, size: 'xs', color: THEME.lavenderHaze, align: 'end', flex: 1 },
            ],
          },
          {
            type: 'text',
            text: `รวม ${params.billCount} บิล • ${params.totalSpend.toLocaleString()} ฿`,
            size: 'xl',
            color: THEME.surface,
            margin: 'md',
          },
          {
            type: 'text',
            text: 'จัดการบิล หารเงิน & สร้าง QR พร้อมเพย์',
            size: 'xs',
            color: THEME.lavenderHaze,
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
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderTint,
            borderWidth: '1px',
            borderColor: THEME.border,
            cornerRadius: '12px',
            paddingAll: '12px',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'ทำอะไรได้บ้างในหน้าเว็บ', size: 'xxs', color: THEME.primary },
              {
                type: 'text',
                text: '• จดบิลครบ 4 แบบ (หารเท่า / หารเพิ่ม / หารแยก / กำหนดเอง)\n• คิด VAT, Service Charge และส่วนลดอัตโนมัติ\n• ดูบิลทั้งหมด ลบบิล และสแกน QR พร้อมเพย์',
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
              label: 'เปิดเว็บจัดการบิล / จดบิล',
              uri: liffUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderTint,
            height: 'sm',
            action: { type: 'message', label: 'ดูสรุปยอดโอนในแชท', text: '/สรุปยอด' },
          },
        ],
      },
    },
  };
}

export function buildBillReceiptFlex(params: {
  tripId?: number;
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
    backgroundColor: THEME.lavenderTint,
    cornerRadius: '8px',
    paddingStart: '10px',
    paddingEnd: '10px',
    paddingTop: '6px',
    paddingBottom: '6px',
    contents: [
      { type: 'text', text: s.displayName, size: 'xs', color: THEME.velvetGrape, flex: 1 },
      { type: 'text', text: `${s.netTotal.toLocaleString()} ฿`, size: 'xs', color: THEME.primary, align: 'end' },
    ],
  }));

  const tags: string[] = [];
  if (params.serviceChargePercent > 0) tags.push(`SC ${params.serviceChargePercent}%`);
  if (params.vatPercent > 0) tags.push(`VAT ${params.vatPercent}%`);

  const footerButtons: messagingApi.FlexComponent[] = [
    {
      type: 'button',
      style: 'secondary',
      color: THEME.lavenderTint,
      height: 'sm',
      action: { type: 'message', label: 'สรุปยอดทั้งทริป', text: '/สรุปยอด' },
    },
  ];
  if (params.tripId) {
    footerButtons.unshift({
      type: 'button',
      style: 'primary',
      color: THEME.primary,
      height: 'sm',
      action: {
        type: 'uri',
        label: 'เปิดเว็บจัดการบิล / QR',
        uri: buildLiffBillsUrl(params.tripId),
      },
    });
  }

  return {
    type: 'flex',
    altText: `บิล ${params.title} ${params.grandTotal} บาท`,
    contents: {
      type: 'bubble',
      size: params.shares.length <= 4 && tags.length === 0 ? 'kilo' : 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        background: GRADIENT_HEADER,
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              pillBadge(tags.length > 0 ? tags.join(' • ') : 'บิลใหม่', THEME.lavenderHaze, THEME.velvetGrape),
              { type: 'text', text: `โดย ${params.payerName}`, size: 'xxs', color: THEME.lavenderHaze, align: 'end', flex: 1 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'md',
            alignItems: 'center',
            contents: [
              { type: 'text', text: params.title, size: 'md', color: THEME.surface, flex: 1, wrap: true },
              { type: 'text', text: `${params.grandTotal.toLocaleString()} ฿`, size: 'xl', color: THEME.surface, align: 'end' },
            ],
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'สรุปยอดต่อคน', size: 'xxs', color: THEME.textSecondary, margin: 'none' },
          ...shareRows,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: footerButtons,
      },
    },
  };
}

export function buildBillMenuFlex(params: {
  tripId: number;
  tripName: string;
  tripStatus: string;
  bills: Array<{ id: number; title: string; totalAmount: number; splitMode: string }>;
}): messagingApi.FlexMessage {
  const totalSpend = params.bills.reduce((s, b) => s + b.totalAmount, 0);
  const liffUrl = buildLiffBillsUrl(params.tripId);

  const billRows: messagingApi.FlexComponent[] =
    params.bills.length === 0
      ? [{ type: 'text', text: 'ยังไม่มีบิลในทริปนี้', size: 'xs', color: THEME.textSecondary }]
      : params.bills.slice(-8).map((b, idx) => ({
          type: 'box',
          layout: 'horizontal',
          backgroundColor: THEME.lavenderTint,
          cornerRadius: '8px',
          paddingStart: '10px',
          paddingEnd: '10px',
          paddingTop: '6px',
          paddingBottom: '6px',
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
        background: GRADIENT_HEADER,
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              pillBadge(`${params.bills.length} บิล`, THEME.lavenderHaze, THEME.velvetGrape),
              { type: 'text', text: params.tripName, size: 'xs', color: THEME.lavenderHaze, align: 'end', flex: 1 },
            ],
          },
          {
            type: 'text',
            text: `ยอดใช้จ่ายรวม ${totalSpend.toLocaleString()} ฿`,
            size: 'lg',
            color: THEME.surface,
            margin: 'md',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '16px',
        contents: [
          ...billRows,
          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: THEME.lavenderTint,
            borderWidth: '1px',
            borderColor: THEME.border,
            cornerRadius: '10px',
            paddingAll: '10px',
            margin: 'md',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'แนะนำ: จดบิลและดู QR พร้อมเพย์ผ่านเว็บ LIFF', size: 'xxs', color: THEME.primary },
              {
                type: 'text',
                text: 'กดปุ่มด้านล่างเพื่อเปิดเว็บจัดการบิล หรือพิมพ์ /หาร เพื่อเรียกปุ่มได้ทุกเมื่อ',
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
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: THEME.primary,
            height: 'sm',
            action: { type: 'uri', label: 'เปิดเว็บจัดการบิล / QR พร้อมเพย์', uri: liffUrl },
          },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              {
                type: 'button',
                style: 'secondary',
                color: THEME.lavenderTint,
                height: 'sm',
                action: { type: 'message', label: 'สรุปยอดโอน', text: '/สรุปยอด' },
              },
              {
                type: 'button',
                style: 'secondary',
                color: THEME.lavenderTint,
                height: 'sm',
                action: { type: 'message', label: 'คำสั่งทั้งหมด', text: '/คำสั่ง' },
              },
            ],
          },
        ],
      },
    },
  };
}

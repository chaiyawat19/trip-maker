import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

type FlexMessage = messagingApi.FlexMessage;

function statusLabel(status: string, start?: string | null, end?: string | null): string {
  if (status === 'COMPLETED') return 'ปิดทริปแล้ว';
  if (status === 'LOCKED') {
    return start && end ? `เริ่มทริปแล้ว (${start} ถึง ${end})` : 'เริ่มทริปแล้ว';
  }
  return 'กำลังวางแผน (ยังไม่เริ่มทริป)';
}

export function buildWelcomeFlex(): FlexMessage {
  return {
    type: 'flex',
    altText: 'สวัสดี! พร้อมไป (PromptPai) พร้อมช่วยวางแผนทริปแล้ว',
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
            text: 'สวัสดี! ผมชื่อ "พร้อมไป (PromptPai)"',
            color: THEME.velvetGrape,
            size: 'md',
            weight: 'regular',
          },
          {
            type: 'text',
            text: 'ผู้ช่วยหาวันว่าง & หารค่าใช้จ่ายประจำกลุ่ม',
            color: THEME.textSecondary,
            size: 'xs',
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
          stepRow('1', 'สร้างทริป & รวมแก๊ง', 'พิมพ์ /สร้างทริป <ชื่อทริป> แล้วให้เพื่อนกดเข้าร่วม'),
          stepRow('2', 'หาวันว่าง & เริ่มทริป', 'พิมพ์ /นัด 1-15 ธ.ค. 3วัน หรือ /เริ่มทริป เพื่อเปิดหารเงิน'),
          stepRow('3', 'จดบิล & เคลียร์ยอดโอน', 'รองรับหารเท่า, +เบียร์เฉพาะคน, VAT/SC และปิดทริป'),
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
            action: { type: 'message', label: '+ สร้างทริปใหม่', text: '/สร้างทริป ทริปใหม่' },
          },
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderHaze,
            height: 'sm',
            action: { type: 'message', label: 'วิธีใช้', text: '/วิธีใช้' },
          },
        ],
      },
    },
  };
}

export function buildTripCreatedFlex(params: {
  tripId: number;
  tripName: string;
  status: string;
  lockedStartDate?: string | null;
  lockedEndDate?: string | null;
  members: Array<{ displayName: string; isGuest: boolean }>;
}): FlexMessage {
  const memberList =
    params.members.map((m) => m.displayName + (m.isGuest ? ' (Guest)' : '')).join(', ') ||
    'ยังไม่มีสมาชิก';

  const footerButtons: messagingApi.FlexButton[] = [
    {
      type: 'button',
      style: 'primary',
      color: THEME.primary,
      height: 'sm',
      action: {
        type: 'postback',
        label: 'เข้าร่วมทริป',
        data: `action=join_trip&tripId=${params.tripId}`,
      },
    },
  ];

  if (params.status === 'PLANNING') {
    footerButtons.push({
      type: 'button',
      style: 'secondary',
      color: THEME.lavenderHaze,
      height: 'sm',
      action: {
        type: 'postback',
        label: 'เริ่มทริปเลย',
        data: `action=start_trip_now&tripId=${params.tripId}`,
      },
    });
  }

  return {
    type: 'flex',
    altText: `ทริป ${params.tripName} (${params.members.length} คน)`,
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
            text: `ACTIVE TRIP • ${statusLabel(params.status, params.lockedStartDate, params.lockedEndDate)}`,
            color: THEME.primary,
            size: 'xxs',
            wrap: true,
          },
          {
            type: 'text',
            text: params.tripName,
            color: THEME.velvetGrape,
            size: 'lg',
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
            text: `สมาชิก (${params.members.length} คน)`,
            color: THEME.textSecondary,
            size: 'xs',
          },
          {
            type: 'text',
            text: memberList,
            color: THEME.velvetGrape,
            size: 'sm',
            wrap: true,
          },
          {
            type: 'text',
            text: 'เปลี่ยนชื่อพิมพ์ /เปลี่ยนชื่อทริป <ชื่อใหม่>',
            color: THEME.textSecondary,
            size: 'xxs',
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: footerButtons,
      },
    },
  };
}

export function buildTripListFlex(params: {
  activeTripId: number | null;
  trips: Array<{
    id: number;
    name: string;
    status: string;
    lockedStartDate?: string | null;
    lockedEndDate?: string | null;
    memberCount: number;
    billCount: number;
    totalSpend: number;
  }>;
}): FlexMessage {
  const bubbles: messagingApi.FlexBubble[] = params.trips.slice(0, 10).map((t) => {
    const isActive = t.id === params.activeTripId;
    const buttons: messagingApi.FlexButton[] = [];

    if (!isActive && t.status !== 'COMPLETED') {
      buttons.push({
        type: 'button',
        style: 'primary',
        color: THEME.primary,
        height: 'sm',
        action: {
          type: 'postback',
          label: 'สลับเป็นทริปนี้',
          data: `action=switch_trip&tripId=${t.id}`,
        },
      });
    } else if (isActive && t.status !== 'COMPLETED') {
      buttons.push({
        type: 'button',
        style: 'secondary',
        color: THEME.lavenderHaze,
        height: 'sm',
        action: {
          type: 'postback',
          label: 'ปิดทริปนี้',
          data: `action=close_trip&tripId=${t.id}`,
        },
      });
    }

    return {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: isActive ? THEME.lavenderHaze : THEME.lavenderTint,
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: isActive ? 'กำลังใช้งานอยู่ (ACTIVE)' : statusLabel(t.status, t.lockedStartDate, t.lockedEndDate),
            size: 'xxs',
            color: THEME.velvetGrape,
          },
          {
            type: 'text',
            text: t.name,
            size: 'md',
            color: THEME.velvetGrape,
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'xs',
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: `สถานะ: ${statusLabel(t.status, t.lockedStartDate, t.lockedEndDate)}`,
            size: 'xs',
            color: THEME.textSecondary,
            wrap: true,
          },
          {
            type: 'text',
            text: `สมาชิก ${t.memberCount} คน • ${t.billCount} บิล (${t.totalSpend.toLocaleString()} ฿)`,
            size: 'xs',
            color: THEME.velvetGrape,
          },
        ],
      },
      ...(buttons.length > 0
        ? {
            footer: {
              type: 'box' as const,
              layout: 'vertical' as const,
              contents: buttons,
            },
          }
        : {}),
    };
  });

  return {
    type: 'flex',
    altText: `รายการทริปทั้งหมด (${params.trips.length} ทริป)`,
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  };
}

export function buildTripCompletedFlex(params: {
  tripName: string;
  lockedStartDate?: string | null;
  lockedEndDate?: string | null;
  memberCount: number;
  billCount: number;
  totalSpend: number;
}): FlexMessage {
  const dateText =
    params.lockedStartDate && params.lockedEndDate
      ? `${params.lockedStartDate} ถึง ${params.lockedEndDate}`
      : 'ไม่ได้ระบุช่วงวัน';

  return {
    type: 'flex',
    altText: `ปิดทริป ${params.tripName} เรียบร้อย`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: THEME.lavenderHaze,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'TRIP COMPLETED', size: 'xxs', color: THEME.velvetGrape },
          { type: 'text', text: `ปิดทริป ${params.tripName} เรียบร้อย`, size: 'md', color: THEME.velvetGrape, margin: 'xs' },
          { type: 'text', text: dateText, size: 'xs', color: THEME.textSecondary, margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          statBox('สมาชิก', `${params.memberCount} คน`),
          statBox('จำนวนบิล', `${params.billCount} บิล`),
          statBox('ยอดรวม', `${params.totalSpend.toLocaleString()} ฿`),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderHaze,
            height: 'sm',
            action: { type: 'message', label: '+ สร้างทริปถัดไป', text: '/สร้างทริป ทริปใหม่' },
          },
        ],
      },
    },
  };
}

function statBox(label: string, value: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    backgroundColor: THEME.lavenderTint,
    cornerRadius: '10px',
    paddingAll: '10px',
    alignItems: 'center',
    contents: [
      { type: 'text', text: label, size: 'xxs', color: THEME.textSecondary },
      { type: 'text', text: value, size: 'sm', color: THEME.velvetGrape, margin: 'xs' },
    ],
  };
}

function stepRow(num: string, title: string, desc: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    spacing: 'md',
    backgroundColor: THEME.lavenderTint,
    cornerRadius: '12px',
    paddingAll: '10px',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        width: '22px',
        height: '22px',
        cornerRadius: '11px',
        backgroundColor: THEME.lavenderHaze,
        justifyContent: 'center',
        alignItems: 'center',
        contents: [{ type: 'text', text: num, size: 'xs', color: THEME.velvetGrape }],
      },
      {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        contents: [
          { type: 'text', text: title, size: 'xs', color: THEME.velvetGrape },
          { type: 'text', text: desc, size: 'xxs', color: THEME.textSecondary, wrap: true },
        ],
      },
    ],
  };
}

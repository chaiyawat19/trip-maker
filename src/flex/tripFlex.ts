import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

type FlexMessage = messagingApi.FlexMessage;

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
          stepRow('1', 'สร้างทริป & รวมแก๊ง', 'พิมพ์ /สร้างทริป ชื่อทริป แล้วให้เพื่อนกดเข้าร่วม'),
          stepRow('2', 'หาวันว่างตรงกัน', 'พิมพ์ /นัด 1-15 ธ.ค. 3วัน แล้วจิ้มวันบนปฏิทิน'),
          stepRow('3', 'จดบิล & เคลียร์ยอดโอน', 'รองรับหารเท่า, +เบียร์เฉพาะคน, VAT/SC'),
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
  members: Array<{ displayName: string; isGuest: boolean }>;
}): FlexMessage {
  const memberList = params.members.map((m) => m.displayName + (m.isGuest ? ' (Guest)' : '')).join(', ') || 'ยังไม่มีสมาชิก';

  return {
    type: 'flex',
    altText: `สร้างทริป ${params.tripName} เรียบร้อย`,
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
            text: 'ACTIVE TRIP',
            color: THEME.primary,
            size: 'xxs',
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
            action: {
              type: 'postback',
              label: 'เข้าร่วมทริป',
              data: `action=join_trip&tripId=${params.tripId}`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            color: THEME.lavenderHaze,
            height: 'sm',
            action: {
              type: 'message',
              label: '+ นัดวันว่าง',
              text: '/นัด 1-15 ธ.ค. 3วัน',
            },
          },
        ],
      },
    },
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

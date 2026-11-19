import type { messagingApi } from '@line/bot-sdk';
import { THEME, GRADIENT_HEADER, GRADIENT_SUCCESS, pillBadge } from './theme.js';
import { formatThaiRange } from '../core/dateMatcher.js';
import { buildLiffBillsUrl } from '../core/promptpay.js';

type FlexMessage = messagingApi.FlexMessage;

function statusLabel(status: string, start?: string | null, end?: string | null): string {
  if (status === 'COMPLETED') return 'ปิดทริปแล้ว';
  if (status === 'LOCKED') {
    return start && end ? `เริ่มทริปแล้ว (${formatThaiRange(start, end)})` : 'เริ่มทริปแล้ว';
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
        background: GRADIENT_HEADER,
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [pillBadge('PROMPTPAI • พร้อมไป', THEME.lavenderHaze, THEME.velvetGrape)],
          },
          {
            type: 'text',
            text: 'สวัสดี! ผมชื่อ "พร้อมไป"',
            color: THEME.surface,
            size: 'lg',
            margin: 'md',
          },
          {
            type: 'text',
            text: 'ผู้ช่วยหาวันว่าง & หารค่าใช้จ่ายประจำกลุ่ม',
            color: THEME.lavenderHaze,
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
          stepRow('3', 'จดบิล & QR พร้อมเพย์', 'พิมพ์ /หาร เพื่อเปิดเว็บ LIFF จดบิลและสแกน QR โอนเงิน'),
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
            color: THEME.lavenderTint,
            height: 'sm',
            action: { type: 'message', label: 'คำสั่งทั้งหมด', text: '/คำสั่ง' },
          },
        ],
      },
    },
  };
}

function renderMemberAvatar(
  m: { displayName: string; avatarUrl?: string | null; isGuest: boolean },
  px = 28,
): messagingApi.FlexBox {
  const radius = `${Math.round(px / 2)}px`;
  const size = `${px}px`;
  const initial = (m.displayName || '?').slice(0, 1);

  if (m.avatarUrl && m.avatarUrl.startsWith('https://')) {
    return {
      type: 'box',
      layout: 'vertical',
      width: size,
      height: size,
      cornerRadius: radius,
      contents: [
        {
          type: 'image',
          url: m.avatarUrl,
          size: 'full',
          aspectRatio: '1:1',
          aspectMode: 'cover',
        },
      ],
    };
  }

  return {
    type: 'box',
    layout: 'vertical',
    width: size,
    height: size,
    cornerRadius: radius,
    backgroundColor: m.isGuest ? THEME.maybeBg : THEME.lavenderHaze,
    justifyContent: 'center',
    alignItems: 'center',
    contents: [
      {
        type: 'text',
        text: initial,
        size: px >= 34 ? 'sm' : 'xxs',
        color: m.isGuest ? THEME.maybeText : THEME.velvetGrape,
      },
    ],
  };
}

export function buildTripCreatedFlex(params: {
  tripId: number;
  tripName: string;
  status: string;
  lockedStartDate?: string | null;
  lockedEndDate?: string | null;
  members: Array<{ displayName: string; avatarUrl?: string | null; isGuest: boolean }>;
}): FlexMessage {
  const memberRows: messagingApi.FlexBox[] =
    params.members.length === 0
      ? [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [{ type: 'text', text: 'ยังไม่มีสมาชิก', size: 'xs', color: THEME.textSecondary }],
          },
        ]
      : params.members.slice(0, 8).map((m) => ({
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          alignItems: 'center',
          contents: [
            renderMemberAvatar(m, 26),
            {
              type: 'text',
              text: m.displayName + (m.isGuest ? ' (Guest)' : ''),
              size: 'xs',
              color: THEME.velvetGrape,
              flex: 1,
              wrap: true,
            },
          ],
        }));

  if (params.members.length > 8) {
    memberRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `และอีก ${params.members.length - 8} คน (พิมพ์ /สมาชิก เพื่อดูทั้งหมด)`,
          size: 'xxs',
          color: THEME.textSecondary,
        },
      ],
    });
  }

  const dateText =
    params.lockedStartDate && params.lockedEndDate
      ? formatThaiRange(params.lockedStartDate, params.lockedEndDate)
      : params.status === 'LOCKED'
        ? 'ยังไม่ได้กำหนด (พิมพ์ /ตั้งวัน 19-21 พ.ย.)'
        : 'รอนัดวันว่าง (พิมพ์ /นัด 1-15 ธ.ค. 3วัน)';

  const nextStepsText =
    params.status === 'LOCKED'
      ? [
          '• /ตั้งวัน 19-21 พ.ย. — กำหนดหรือเปลี่ยนวันเดินทาง',
          '• /เพิ่มคน <ชื่อ> — เพิ่มเพื่อนหรือ Guest นอกกลุ่ม',
          '• /หาร — เปิดเว็บ LIFF จดบิลหารเงิน & สแกน QR พร้อมเพย์',
          '• /สรุปยอด — ดูยอดโอนสุทธิและเคลียร์เงิน',
          '• /ปิดทริป — ปิดทริปเมื่อเคลียร์ยอดครบแล้ว',
        ].join('\n')
      : [
          '• /นัด 1-15 ธ.ค. 3วัน — สร้างปฏิทินหาวันว่างในเว็บ',
          '• /เริ่มทริป 19-21 พ.ย. — ข้ามการโหวตและเริ่มทริปทันที',
          '• /เพิ่มคน <ชื่อ> — เพิ่มเพื่อนหรือ Guest นอกกลุ่ม',
          '• /เปลี่ยนชื่อทริป <ชื่อใหม่> — แก้ไขชื่อทริป',
        ].join('\n');

  const footerButtons: messagingApi.FlexButton[] = [
    {
      type: 'button',
      style: params.status === 'LOCKED' ? 'secondary' : 'primary',
      color: params.status === 'LOCKED' ? THEME.lavenderHaze : THEME.primary,
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
  } else if (params.status === 'LOCKED') {
    footerButtons.unshift({
      type: 'button',
      style: 'primary',
      color: THEME.primary,
      height: 'sm',
      action: {
        type: 'uri',
        label: 'เปิดเว็บจัดการบิล (/หาร)',
        uri: buildLiffBillsUrl(params.tripId),
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
        background: params.status === 'COMPLETED' ? GRADIENT_SUCCESS : GRADIENT_HEADER,
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            contents: [
              pillBadge(
                params.status === 'LOCKED' ? 'เริ่มทริปแล้ว' : params.status === 'COMPLETED' ? 'ปิดทริปแล้ว' : 'กำลังวางแผน',
                params.status === 'LOCKED' ? THEME.freeBg : THEME.lavenderHaze,
                params.status === 'LOCKED' ? THEME.freeText : THEME.velvetGrape,
              ),
              {
                type: 'text',
                text: `${params.members.length} สมาชิก`,
                size: 'xs',
                color: THEME.lavenderHaze,
                align: 'end',
                flex: 1,
              },
            ],
          },
          {
            type: 'text',
            text: params.tripName,
            color: THEME.surface,
            size: 'xl',
            margin: 'md',
            wrap: true,
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
            layout: 'horizontal',
            alignItems: 'center',
            backgroundColor: THEME.lavenderTint,
            borderWidth: '1px',
            borderColor: THEME.border,
            cornerRadius: '12px',
            paddingAll: '10px',
            contents: [
              { type: 'text', text: 'วันเดินทาง', size: 'xs', color: THEME.primary, flex: 2 },
              { type: 'text', text: dateText, size: 'xs', color: THEME.velvetGrape, flex: 5, align: 'end', wrap: true },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            borderWidth: '1px',
            borderColor: THEME.border,
            cornerRadius: '12px',
            paddingAll: '12px',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `สมาชิก (${params.members.length} คน)`,
                color: THEME.primary,
                size: 'xxs',
              },
              ...memberRows,
            ],
          },
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
              { type: 'text', text: 'ทำอะไรต่อได้บ้าง', size: 'xxs', color: THEME.primary },
              {
                type: 'text',
                text: nextStepsText,
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
      ? formatThaiRange(params.lockedStartDate, params.lockedEndDate)
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

export function buildMembersFlex(params: {
  tripId: number;
  tripName: string;
  createdByUserId?: string | null;
  members: Array<{
    displayName: string;
    lineUserId?: string | null;
    avatarUrl?: string | null;
    isGuest: boolean;
  }>;
}): FlexMessage {
  const memberRows: messagingApi.FlexBox[] =
    params.members.length === 0
      ? [{ type: 'box', layout: 'vertical', contents: [{ type: 'text', text: 'ยังไม่มีสมาชิกในทริป', size: 'xs', color: THEME.textSecondary }] }]
      : params.members.slice(0, 20).map((m) => {
          const isOwner = Boolean(params.createdByUserId && m.lineUserId === params.createdByUserId);
          const roleText = isOwner ? 'เจ้าของทริป' : m.isGuest ? 'Guest (คนนอกกลุ่ม)' : 'สมาชิก';
          const initial = (m.displayName || '?').slice(0, 1);

          const avatarBox: messagingApi.FlexBox =
            m.avatarUrl && m.avatarUrl.startsWith('https://')
              ? {
                  type: 'box',
                  layout: 'vertical',
                  width: '36px',
                  height: '36px',
                  cornerRadius: '18px',
                  contents: [
                    {
                      type: 'image',
                      url: m.avatarUrl,
                      size: 'full',
                      aspectRatio: '1:1',
                      aspectMode: 'cover',
                    },
                  ],
                }
              : {
                  type: 'box',
                  layout: 'vertical',
                  width: '36px',
                  height: '36px',
                  cornerRadius: '18px',
                  backgroundColor: m.isGuest ? THEME.maybeBg : THEME.lavenderHaze,
                  justifyContent: 'center',
                  alignItems: 'center',
                  contents: [
                    {
                      type: 'text',
                      text: initial,
                      size: 'sm',
                      color: m.isGuest ? THEME.maybeText : THEME.velvetGrape,
                    },
                  ],
                };

          return {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            alignItems: 'center',
            backgroundColor: THEME.lavenderTint,
            cornerRadius: '12px',
            paddingAll: '10px',
            contents: [
              avatarBox,
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: m.displayName, size: 'sm', color: THEME.velvetGrape, wrap: true },
                  { type: 'text', text: roleText, size: 'xxs', color: isOwner ? THEME.primary : THEME.textSecondary },
                ],
              },
            ],
          };
        });

  return {
    type: 'flex',
    altText: `สมาชิกทริป ${params.tripName} (${params.members.length} คน)`,
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
              pillBadge(`สมาชิก ${params.members.length} คน`, THEME.lavenderHaze, THEME.velvetGrape),
            ],
          },
          { type: 'text', text: params.tripName, size: 'lg', color: THEME.surface, margin: 'md' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        contents: memberRows,
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

import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

export function buildHelpFlex(): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'คู่มือคำสั่ง PromptPai (พร้อมไป)',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: THEME.lavenderTint,
        paddingAll: '16px',
        contents: [
          { type: 'text', text: 'คู่มือคำสั่ง PromptPai (พร้อมไป)', size: 'md', color: THEME.velvetGrape },
          { type: 'text', text: 'พิมพ์สั้นๆ ในแชทกลุ่มได้เลย', size: 'xs', color: THEME.textSecondary, margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          section('ทริป & สมาชิก', '/สร้างทริป <ชื่อ> • /เปลี่ยนชื่อทริป <ชื่อ> • /เริ่มทริป • /ทริป • /เข้าทริป • /เพิ่มคน <ชื่อ> • /ปิดทริป'),
          section('หาวันว่างพร้อมกัน', '/นัด 1-15 ธ.ค. 3วัน • /ว่าง ... • /ไม่ว่าง ... • /วันว่าง • /ตามเพื่อน'),
          section('หารเงิน & เคลียร์ยอด', '/หาร <ชื่อ> <ยอด> [+เพิ่ม(@คน)] [+vat7] • /บิลทั้งหมด • /สรุปเงิน (/สรุปยอด)'),
        ],
      },
    },
  };
}

function section(title: string, commands: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    spacing: 'xs',
    contents: [
      { type: 'text', text: title, size: 'xs', color: THEME.primary },
      { type: 'text', text: commands, size: 'xxs', color: THEME.textSecondary, wrap: true },
    ],
  };
}

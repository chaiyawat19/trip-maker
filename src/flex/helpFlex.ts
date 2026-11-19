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
          { type: 'text', text: 'แยกคำสั่งชัดเจน ก๊อปปี้ไปแก้ตัวเลขใช้ได้เลย', size: 'xs', color: THEME.textSecondary, margin: 'xs' },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          section(
            '1. ทริป & สมาชิก',
            '/สร้างทริป เชียงใหม่\n/เปลี่ยนชื่อทริป เกาะล้าน\n/ทริป (ดู/สลับทริป)\n/เข้าทริป หรือ /เพิ่มคน แฟนเอ\n/เริ่มทริป (เปิดให้หารเงินเลย)\n/ปิดทริป',
          ),
          section(
            '2. หาวันว่างพร้อมกัน',
            '/นัด 1-15 ธ.ค. 3วัน (เปิดปฏิทินจิ้มวัน)\n/ว่าง 1-5 ธ.ค. | /ไม่ว่าง 6-7 ธ.ค.\n/วันว่าง (ดูสรุป) | /ตามเพื่อน',
          ),
          section(
            '3. หารเงิน (แยก 4 แบบใช้ง่าย)',
            '• หารเท่าทุกคน:\n  /หารรวม ค่ารถ 2000\n• หารรวม + บวกเพิ่มเฉพาะคน:\n  /หารเพิ่ม ค่าข้าว 1200 +เบียร์ 400 @เอ @บี\n• หารแยกตามรายการ (ขึ้นบรรทัดใหม่):\n  /หารแยก ปิ้งย่าง\n  หมู 600 @เอ @บี\n  เบียร์ 300 @บี\n• กำหนดยอดเอง:\n  /หารเอง ค่าน้ำมัน @เอ=500 @บี=300\n(ต่อท้าย +vat7 หรือ +sc10 ได้ทุกแบบ)',
          ),
          section(
            '4. สรุปยอดโอน',
            '/บิลทั้งหมด | /สรุปเงิน (/สรุปยอด)',
          ),
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
    backgroundColor: THEME.lavenderTint,
    cornerRadius: '10px',
    paddingAll: '10px',
    contents: [
      { type: 'text', text: title, size: 'xs', color: THEME.primary },
      { type: 'text', text: commands, size: 'xxs', color: THEME.velvetGrape, wrap: true },
    ],
  };
}

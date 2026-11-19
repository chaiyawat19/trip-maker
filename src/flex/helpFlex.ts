import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

export function buildHelpFlex(): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'คำสั่งทั้งหมดและคู่มือ PromptPai (พร้อมไป)',
    contents: {
      type: 'carousel',
      contents: [
        helpBubble(
          '1/4 • เริ่มต้น & จัดการทริป',
          'สร้างทริป สมาชิก และตั้งวันเดินทาง',
          [
            item('/สร้างทริป <ชื่อ>', 'สร้างทริปใหม่และตั้งเป็น Active Trip\nตัวอย่าง: /สร้างทริป เชียงใหม่'),
            item('/เปลี่ยนชื่อทริป หรือ /ตั้งชื่อทริป <ชื่อใหม่>', 'เปลี่ยนชื่อทริปที่กำลังใช้งานอยู่'),
            item('/ทริป', 'ดูทริปทั้งหมดในกลุ่มและสลับทริปที่ใช้งาน'),
            item('/เข้าทริป, /เพิ่มคน <ชื่อ>, /สมาชิก', 'เข้าร่วมทริป, เพิ่ม Guest นอกกลุ่ม, ดูรายชื่อพร้อมรูปโปรไฟล์'),
            item('/เริ่มทริป [ช่วงวัน] หรือ /ตั้งวัน <ช่วงวัน>', 'เริ่มทริปทันทีพร้อมกำหนดวัน (หรือใช้ /วันทริป)\nตัวอย่าง: /เริ่มทริป 19-21 พ.ย.'),
          ],
        ),
        helpBubble(
          '2/4 • หาวันว่าง & แจ้งเตือน',
          'นัดวันในเว็บ เช็กสถานะ และตามเพื่อน',
          [
            item('/นัด <ช่วงวัน> <จำนวนวัน>', 'สร้างปฏิทิน 7 ช่อง พร้อมปุ่ม "เลือกวันว่างในเว็บ"\nตัวอย่าง: /นัด 1-15 ธ.ค. 3วัน'),
            item('/วันว่าง และ /ตามเพื่อน', 'ดูสรุปปฏิทินล่าสุด หรือเช็กว่าใครยังไม่ตอบวันว่าง'),
            item('/ว่าง /ไม่ว่าง /อาจจะ <วัน>', 'ลงสถานะแบบพิมพ์เร็ว เช่น /ว่าง 5-7 ธ.ค.'),
            item('/ลงวันแทน <ชื่อ Guest> <สถานะ> <วัน>', 'เฉพาะเจ้าของทริปลงวันแทน Guest (หรือเลือกในเว็บ)\nตัวอย่าง: /ลงวันแทน แฟนเอ ไม่ว่าง 5-7 ธ.ค.'),
          ],
        ),
        helpBubble(
          '3/4 • หารเงิน 4 รูปแบบ',
          'ต้องล็อกวันหรือพิมพ์ /เริ่มทริป ก่อนจดบิล',
          [
            item('/หาร (แนะนำ — เปิดเว็บ LIFF)', 'เปิดเว็บจัดการบิลครบ 4 แบบ ดู/ลบบิล และสแกน QR พร้อมเพย์'),
            item('/หารรวม <รายการ> <ยอด>', 'หารเท่าทุกคน หรือระบุ @ชื่อ\nตัวอย่าง: /หารรวม ค่ารถ 2000'),
            item('/หารเพิ่ม <รายการ> <ยอด> +<เพิ่ม> <ยอด> @ชื่อ', 'ยอดหลักหารทุกคน + รายการเฉพาะคน (หรือ /หารรวมเพิ่ม)\nตัวอย่าง: /หารเพิ่ม ค่าข้าว 1200 +เบียร์ 400 @เอ @บี'),
            item('/หารแยก <หัวข้อ> และ /หารเอง <หัวข้อ> @ชื่อ=ยอด', 'คิดแยกทีละเมนู (ขึ้นบรรทัดใหม่) หรือกำหนดยอดเอง\nรองรับ +vat7, +sc10, -ส่วนลด ในทุกคำสั่ง'),
          ],
        ),
        helpBubble(
          '4/4 • พร้อมเพย์ QR, สรุป & ปิดทริป',
          'ผูกพร้อมเพย์ เคลียร์ยอด และคำสั่งช่วยเหลือ',
          [
            item('/พร้อมเพย์ <เบอร์มือถือ/เลขบัตร 13 หลัก>', 'ผูกบัญชีรับเงิน (พิมพ์ในแชท 1-on-1 กับบอทหรือในกลุ่ม)\nตัวอย่าง: /พร้อมเพย์ 0812345678'),
            item('/บิล และ /บิลทั้งหมด', 'ดูรายการบิลทั้งหมดและเปิดเว็บจัดการบิล'),
            item('/สรุปยอด (หรือ /สรุปเงิน, /เคลียร์ยอด)', 'คำนวณยอดโอนสุทธิ พร้อมปุ่มดู QR พร้อมเพย์และอัปเดตสถานะ'),
            item('/ปิดทริป และ /คำสั่ง (หรือ /วิธีใช้)', 'ปิดทริปเมื่อเคลียร์เงินครบ หรือเรียกดูคำสั่งทั้งหมดอีกครั้ง'),
          ],
        ),
      ],
    },
  };
}

function helpBubble(
  title: string,
  subtitle: string,
  rows: messagingApi.FlexBox[],
): messagingApi.FlexBubble {
  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      backgroundColor: THEME.lavenderTint,
      paddingAll: '14px',
      contents: [
        { type: 'text', text: title, size: 'sm', color: THEME.velvetGrape },
        { type: 'text', text: subtitle, size: 'xxs', color: THEME.primary, margin: 'xs' },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      paddingAll: '14px',
      contents: rows,
    },
  };
}

function item(cmd: string, desc: string): messagingApi.FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    backgroundColor: THEME.lavenderTint,
    cornerRadius: '10px',
    paddingAll: '10px',
    spacing: 'xs',
    contents: [
      { type: 'text', text: cmd, size: 'xs', color: THEME.primary, wrap: true },
      { type: 'text', text: desc, size: 'xxs', color: THEME.velvetGrape, wrap: true },
    ],
  };
}

import type { messagingApi } from '@line/bot-sdk';
import { THEME } from './theme.js';

export function buildHelpFlex(): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: 'คู่มือการใช้งาน PromptPai (พร้อมไป) แบบละเอียด',
    contents: {
      type: 'carousel',
      contents: [
        helpBubble(
          '1/4 • เริ่มต้น & จัดการทริป',
          'ขั้นตอนสร้างทริปและรวมสมาชิก',
          [
            item('/สร้างทริป <ชื่อ>', 'สร้างทริปใหม่และตั้งเป็น Active Trip\nตัวอย่าง: /สร้างทริป เชียงใหม่'),
            item('/เปลี่ยนชื่อทริป <ชื่อใหม่>', 'เปลี่ยนชื่อทริปที่กำลังใช้งานอยู่\nตัวอย่าง: /เปลี่ยนชื่อทริป เกาะล้าน'),
            item('/เข้าทริป หรือ /เพิ่มคน <ชื่อ>', 'ลงทะเบียนสมาชิก (หรือเพิ่มเพื่อนที่ไม่มีในกลุ่ม)\nตัวอย่าง: /เพิ่มคน แฟนเอ'),
            item('/ทริป', 'ดูทริปทั้งหมดในกลุ่มและสลับทริปที่ใช้งาน'),
            item('/เริ่มทริป', 'ข้ามการโหวตวันว่าง เพื่อเปิดหารเงินทันที'),
          ],
        ),
        helpBubble(
          '2/4 • หาวันว่างพร้อมกัน',
          'นัดวันและดูปฏิทินความพร้อม',
          [
            item('/นัด <ช่วงวัน> <จำนวนวัน>', 'สร้างปฏิทิน 7 ช่อง พร้อมปุ่มกดเปิดหน้าเลือกวันแบบไม่สแปมแชท\nตัวอย่าง: /นัด 1-15 ธ.ค. 3วัน'),
            item('วิธีเลือกวัน (ไม่เด้งแชทรัว)', 'กดปุ่ม "เลือกวันว่าง (ไม่เด้งแชทรัว)" บนการ์ด → จิ้มเลือกวันให้ครบ → กดตกลงครั้งเดียว บอทจะส่งสรุปเข้ากลุ่มให้'),
            item('/ลงวันแทน <ชื่อ Guest> <สถานะ> <วัน>', 'เฉพาะเจ้าของทริปลงวันแทนคนนอกกลุ่มได้\nตัวอย่าง: /ลงวันแทน แฟนเอ ไม่ว่าง 5-7 ธ.ค.'),
            item('/ว่าง /ไม่ว่าง /อาจจะ & /วันว่าง', 'พิมพ์ลงสถานะแบบเร็ว หรือดูสรุปปฏิทินล่าสุด'),
          ],
        ),
        helpBubble(
          '3/4 • หารเงินผ่านเว็บ LIFF',
          'ต้องล็อกวันหรือพิมพ์ /เริ่มทริป ก่อนจดบิล',
          [
            item('/หาร (แนะนำ)', 'เปิดหน้าเว็บจัดการบิล (LINE LIFF) จดบิลได้ครบทั้ง 4 แบบ ดูบิลทั้งหมด ลบบิล และสแกน QR พร้อมเพย์'),
            item('/หารรวม (หารเท่า)', 'ตัวอย่าง: /หารรวม ค่ารถ 2000\nหรือใส่ @ชื่อ: /หารรวม กาแฟ 300 @เอ @บี'),
            item('/หารเพิ่ม /หารแยก /หารเอง', 'รองรับคำสั่งแชทด่วนเหมือนเดิม เช่น\n/หารเพิ่ม ค่าข้าว 1200 +เบียร์ 400 @เอ @บี\n/หารเอง ค่าน้ำมัน @เอ=500 @บี=300'),
          ],
        ),
        helpBubble(
          '4/4 • พร้อมเพย์ QR & ปิดทริป',
          'สร้าง QR โอนเงิน เคลียร์ยอด และจบงาน',
          [
            item('/พร้อมเพย์ <เบอร์หรือเลขบัตร>', 'ผูกบัญชีพร้อมเพย์ของคุณ (พิมพ์ในแชทส่วนตัว 1-on-1 กับบอทหรือในกลุ่มก็ได้)\nตัวอย่าง: /พร้อมเพย์ 0812345678'),
            item('/บิล และ /สรุปยอด', 'ดูรายการบิล คำนวณยอดโอนสุทธิ พร้อมปุ่มเปิด QR พร้อมเพย์ในเว็บ LIFF'),
            item('วิธีอัปเดตสถานะโอนเงิน', 'กดปุ่มบนการ์ดหรือในเว็บ LIFF: โอนแล้ว → ยืนยันรับ → เคลียร์แล้ว'),
            item('/ปิดทริป', 'ปิดทริปเมื่อเคลียร์เงินครบ เพื่อเก็บประวัติและเริ่มทริปใหม่'),
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

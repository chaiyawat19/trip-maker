# PromptPai (พร้อมไป) — LINE Bot

LINE Bot สำหรับแชทกลุ่ม ช่วย **หาวันว่างพร้อมกัน** และ **หารค่าใช้จ่ายตามทริป** (หารเท่า, หารรวม+บวกเพิ่มเฉพาะคน, หารตามรายการ, VAT/SC, และลดจำนวนรอบการโอน)

## 1. การติดตั้งและรันบนเครื่อง (Local Setup)

```bash
npm install
cp .env.example .env
```

รันโหมดพัฒนา:
```bash
npm run dev
```

รันชุดทดสอบ (Vitest):
```bash
npm test
```

Build TypeScript:
```bash
npm run build
npm start
```

## 2. การเชื่อมต่อ LINE Developers Console

1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/console/) แล้วสร้าง **Provider** และ **Messaging API Channel**
2. ในแท็บ **LINE Official Account / Messaging API**:
   - เปิด **Allow bot to join group chats**
   - ปิด **Auto-reply messages** (เพื่อไม่ให้ข้อความอัตโนมัติตีกับบอท)
3. คัดลอก **Channel Secret** (แท็บ Basic settings) และ **Channel Access Token (long-lived)** (แท็บ Messaging API) มาใส่ในไฟล์ `.env`:
   ```env
   PORT=3000
   PUBLIC_BASE_URL=https://xxxx.trycloudflare.com
   LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxx
   LINE_CHANNEL_ACCESS_TOKEN=xxxxxxxxxxxxxxxx
   ```
4. เปิด Tunnel ให้ LINE ยิง Webhook เข้าเครื่องได้ (เลือกอย่างใดอย่างหนึ่ง):
   - **Cloudflare Tunnel (ฟรี ไม่ต้องสมัคร):**
     ```bash
     cloudflared tunnel --url http://localhost:3000
     ```
   - **ngrok:**
     ```bash
     ngrok http 3000
     ```
5. นำ URL ที่ได้ไปใส่ในช่อง **Webhook URL** บน LINE Developers Console โดยต่อท้ายด้วย `/webhook` เช่น:
   `https://xxxx.trycloudflare.com/webhook`
6. กดปุ่ม **Verify** และเปิดสวิตช์ **Use webhook**

## 3. คำสั่งหลักในแชทกลุ่ม
- `/สร้างทริป <ชื่อทริป>` — สร้างทริปและตั้งเป็น Active Trip
- `/เข้าทริป` / `/เพิ่มคน <ชื่อ Guest>` — ลงทะเบียนสมาชิก
- `/นัด 1-15 ธ.ค. 3วัน` — เปิดโพลหาวันว่างติดกัน 3 วัน
- `/ว่าง 1-5 ธ.ค.` / `/ไม่ว่าง 6-7 ธ.ค.` — ลงสถานะวันว่าง
- `/หาร ค่าข้าว 1200 +เบียร์ 400(@เอ @บี) +vat7` — จดบิลแบบหารรวม+บวกเพิ่ม
- `/สรุปเงิน` — คำนวณยอดสุทธิและลดจำนวนรอบการโอน

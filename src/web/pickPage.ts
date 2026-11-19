import { formatThaiRange } from '../core/dateMatcher.js';

export function renderPickPage(params: {
  pollId: number;
  tripName: string;
  tripStatus: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  members: Array<{ id: number; displayName: string; isGuest: boolean }>;
  records: Array<{ memberId: number; date: string; status: 'FREE' | 'MAYBE' | 'BUSY' }>;
}): string {
  const isClosed = params.tripStatus === 'COMPLETED';
  const dataJson = JSON.stringify({ ...params, isClosed });
  const shortRange = formatThaiRange(params.startDate, params.endDate, params.durationDays);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>เลือกวันว่าง — ${params.tripName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; font-family: 'Kanit', sans-serif; font-weight: 400; }
    body { margin: 0; background: #F4F0FD; color: #36255C; padding: 16px; }
    .card { max-width: 440px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; border: 1px solid #E8E2F8; box-shadow: 0 8px 24px rgba(54,37,92,0.08); overflow: hidden; }
    .header { background: #F4F0FD; padding: 18px 20px; border-bottom: 1px solid #E8E2F8; }
    .badge { display: inline-block; background: #D2C3F6; color: #36255C; font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 999px; }
    .closed-banner { background: #FEE2E2; color: #DC2626; font-size: 13px; font-weight: 500; padding: 10px 14px; border-radius: 12px; border: 1px solid #FCA5A5; }
    h1 { margin: 8px 0 2px; font-size: 18px; font-weight: 500; color: #36255C; }
    .sub { font-size: 12px; color: #6B6280; }
    .body { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
    label { font-size: 12px; color: #6B6280; display: block; margin-bottom: 6px; font-weight: 500; }
    select { width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid #D2C3F6; background: #FFFFFF; color: #36255C; font-size: 14px; outline: none; }
    .modes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F4F0FD; padding: 4px; border-radius: 12px; }
    .mode-btn { border: none; background: transparent; padding: 8px 4px; border-radius: 9px; font-size: 13px; color: #6B6280; cursor: pointer; transition: 0.15s; }
    .mode-btn.active { background: #FFFFFF; color: #36255C; font-weight: 500; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
    .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; font-size: 11px; color: #6B6280; font-weight: 500; }
    .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
    .day { height: 42px; border-radius: 10px; border: 1px solid #E8E2F8; background: #F4F0FD; color: #36255C; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.1s; }
    .day:disabled { opacity: 0.7; cursor: not-allowed; }
    .day.FREE { background: #DCFCE7; border-color: #86EFAC; color: #16A34A; font-weight: 500; }
    .day.MAYBE { background: #FEF3C7; border-color: #FCD34D; color: #D97706; font-weight: 500; }
    .day.BUSY { background: #FEE2E2; border-color: #FCA5A5; color: #DC2626; text-decoration: line-through; }
    .quick-row { display: flex; gap: 8px; }
    .btn-sec { flex: 1; padding: 10px; border-radius: 12px; border: 1px solid #D2C3F6; background: #FFFFFF; color: #36255C; font-size: 13px; font-weight: 500; cursor: pointer; }
    .btn-pri { width: 100%; padding: 12px; border-radius: 12px; border: none; background: #7E63C4; color: #FFFFFF; font-size: 15px; font-weight: 500; cursor: pointer; }
    .btn-pri:disabled, .btn-sec:disabled { opacity: 0.5; cursor: not-allowed; }
    .msg { text-align: center; font-size: 13px; color: #16A34A; font-weight: 500; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">${params.tripName} • ${shortRange}</span>
      <h1>${isClosed ? 'ทริปนี้ปิดไปแล้ว' : 'เลือกวันว่างของคุณ'}</h1>
      <div class="sub">${isClosed ? 'ดูสรุปวันว่างได้อย่างเดียว ไม่สามารถแก้ไขได้' : 'กดเลือกครบทุกวันแล้วค่อยกดตกลงทีเดียว'}</div>
    </div>
    <div class="body">
      ${isClosed ? '<div class="closed-banner">ทริปนี้ปิดไปแล้ว ไม่สามารถแก้ไขหรือส่งวันว่างเพิ่มเติมได้</div>' : ''}
      <div>
        <label for="memberSelect">เลือกชื่อของคุณ (หรือ Guest สำหรับเจ้าของทริป)</label>
        <select id="memberSelect"></select>
      </div>

      <div>
        <label>1. เลือกโหมดสถานะ แล้วจิ้มวันที่ด้านล่าง</label>
        <div class="modes">
          <button class="mode-btn active" id="m-FREE" onclick="setMode('FREE')">ว่าง</button>
          <button class="mode-btn" id="m-MAYBE" onclick="setMode('MAYBE')">อาจจะ</button>
          <button class="mode-btn" id="m-BUSY" onclick="setMode('BUSY')">ไม่ว่าง</button>
        </div>
      </div>

      <div class="weekdays"><div>จ</div><div>อ</div><div>พ</div><div>พฤ</div><div>ศ</div><div>ส</div><div>อา</div></div>
      <div class="grid" id="calGrid"></div>

      <div class="quick-row">
        <button class="btn-sec" ${isClosed ? 'disabled' : ''} onclick="fillAll('FREE')">ว่างทุกวัน</button>
        <button class="btn-sec" ${isClosed ? 'disabled' : ''} onclick="fillAll('')">ล้างที่เลือก</button>
      </div>

      <button class="btn-pri" id="saveBtn" ${isClosed ? 'disabled' : ''} onclick="submitDates()">${isClosed ? 'ทริปนี้ปิดไปแล้ว' : 'ตกลงบันทึกทั้งหมด'}</button>
      <div class="msg" id="doneMsg">บันทึกเรียบร้อย! ส่งสรุปเข้ากลุ่ม LINE แล้ว ปิดหน้านี้ได้เลย</div>
    </div>
  </div>

  <script>
    const DATA = ${dataJson};
    let currentMode = 'FREE';
    let selections = {};

    const selectEl = document.getElementById('memberSelect');
    DATA.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.isGuest ? m.displayName + ' (Guest - เจ้าของทริปลงแทน)' : m.displayName;
      selectEl.appendChild(opt);
    });

    function loadMemberSelections() {
      const mId = Number(selectEl.value);
      selections = {};
      DATA.records.filter(r => r.memberId === mId).forEach(r => {
        selections[r.date] = r.status;
      });
      renderGrid();
    }

    selectEl.addEventListener('change', loadMemberSelections);

    function setMode(mode) {
      if (DATA.isClosed) return;
      currentMode = mode;
      ['FREE', 'MAYBE', 'BUSY'].forEach(m => {
        document.getElementById('m-' + m).className = m === mode ? 'mode-btn active' : 'mode-btn';
      });
    }

    function enumerate(start, end) {
      const res = [];
      const cur = new Date(start + 'T00:00:00Z');
      const last = new Date(end + 'T00:00:00Z');
      while (cur <= last) {
        res.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return res;
    }

    function renderGrid() {
      const grid = document.getElementById('calGrid');
      grid.innerHTML = '';
      const first = new Date(DATA.startDate + 'T00:00:00Z');
      const offset = (first.getUTCDay() + 6) % 7;
      for (let i = 0; i < offset; i++) grid.appendChild(document.createElement('div'));

      enumerate(DATA.startDate, DATA.endDate).forEach(d => {
        const btn = document.createElement('button');
        const st = selections[d] || '';
        btn.className = 'day ' + st;
        btn.textContent = Number(d.slice(8, 10));
        btn.disabled = Boolean(DATA.isClosed);
        btn.onclick = () => {
          if (DATA.isClosed) return;
          selections[d] = selections[d] === currentMode ? '' : currentMode;
          renderGrid();
        };
        grid.appendChild(btn);
      });
    }

    function fillAll(st) {
      if (DATA.isClosed) return;
      enumerate(DATA.startDate, DATA.endDate).forEach(d => { selections[d] = st; });
      renderGrid();
    }

    async function submitDates() {
      if (DATA.isClosed) return;
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';
      const entries = Object.entries(selections)
        .filter(([, st]) => st)
        .map(([date, status]) => ({ date, status }));

      const res = await fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: DATA.pollId,
          memberId: Number(selectEl.value),
          entries,
        }),
      });
      if (res.ok) {
        document.getElementById('doneMsg').style.display = 'block';
        btn.textContent = 'บันทึกแล้ว';
      } else {
        const err = await res.json().catch(() => ({}));
        btn.disabled = false;
        btn.textContent = err.error || 'ลองใหม่อีกครั้ง';
      }
    }

    loadMemberSelections();
  </script>
</body>
</html>`;
}

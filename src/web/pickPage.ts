import { formatThaiRange } from '../core/dateMatcher.js';

export function renderPickPage(params: {
  tripId: number;
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
    .card { max-width: 460px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; border: 1px solid #E8E2F8; box-shadow: 0 8px 24px rgba(54,37,92,0.08); overflow: hidden; }
    .header { background: #F4F0FD; padding: 18px 20px; border-bottom: 1px solid #E8E2F8; }
    .badge { display: inline-block; background: #D2C3F6; color: #36255C; font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 999px; }
    .closed-banner { background: #FEE2E2; color: #DC2626; font-size: 13px; font-weight: 500; padding: 10px 14px; border-radius: 12px; border: 1px solid #FCA5A5; }
    h1 { margin: 8px 0 2px; font-size: 18px; font-weight: 500; color: #36255C; }
    .sub { font-size: 12px; color: #6B6280; }
    .body { padding: 18px 20px; display: flex; flex-direction: column; gap: 16px; }
    .section { background: #FAF8FF; border: 1px solid #E8E2F8; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
    .section-title { font-size: 13px; font-weight: 500; color: #36255C; display: flex; align-items: center; gap: 6px; margin: 0; }
    label { font-size: 12px; color: #6B6280; display: block; margin-bottom: 4px; font-weight: 500; }
    select, input[type="date"] { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid #D2C3F6; background: #FFFFFF; color: #36255C; font-size: 13px; outline: none; }
    .date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
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
    .btn-sec { flex: 1; padding: 9px 12px; border-radius: 10px; border: 1px solid #D2C3F6; background: #FFFFFF; color: #36255C; font-size: 13px; font-weight: 500; cursor: pointer; }
    .btn-pri { width: 100%; padding: 11px; border-radius: 12px; border: none; background: #7E63C4; color: #FFFFFF; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-pri:disabled, .btn-sec:disabled { opacity: 0.5; cursor: not-allowed; }
    .streak-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; background: #FFFFFF; border: 1px solid #D2C3F6; border-radius: 10px; padding: 9px 12px; }
    .streak-info { font-size: 13px; font-weight: 500; color: #36255C; }
    .streak-sub { font-size: 11px; color: #6B6280; }
    .btn-lock { padding: 6px 12px; border-radius: 8px; border: none; background: #7E63C4; color: #FFFFFF; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
    .btn-lock:disabled { opacity: 0.5; cursor: not-allowed; }
    .msg { text-align: center; font-size: 13px; color: #16A34A; font-weight: 500; display: none; }
    .empty-note { font-size: 12px; color: #6B6280; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge" id="headerBadge">${params.tripName} • ${shortRange}</span>
      <h1>${isClosed ? 'ทริปนี้ปิดไปแล้ว' : 'เลือกวันว่างและกำหนดวันทริป'}</h1>
      <div class="sub">${isClosed ? 'ดูสรุปวันว่างได้อย่างเดียว ไม่สามารถแก้ไขได้' : 'ตั้งช่วงวันที่ต้องการสำรวจ เลือกวันว่าง แล้วดูวันที่ทุกคนว่างตรงกัน'}</div>
    </div>
    <div class="body">
      ${isClosed ? '<div class="closed-banner">ทริปนี้ปิดไปแล้ว ไม่สามารถแก้ไขหรือส่งวันว่างเพิ่มเติมได้</div>' : ''}

      <div class="section">
        <div class="section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7E63C4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ช่วงวันที่เปิดให้เพื่อนลงวันว่าง
        </div>
        <div class="date-row">
          <div>
            <label for="rangeStart">วันเริ่มต้น</label>
            <input type="date" id="rangeStart" value="${params.startDate}" ${isClosed ? 'disabled' : ''} />
          </div>
          <div>
            <label for="rangeEnd">วันสิ้นสุด</label>
            <input type="date" id="rangeEnd" value="${params.endDate}" ${isClosed ? 'disabled' : ''} />
          </div>
        </div>
        <button class="btn-sec" id="rangeBtn" ${isClosed ? 'disabled' : ''} onclick="updatePollRange()">อัปเดตช่วงวันที่สำรวจ</button>
        <div class="msg" id="rangeMsg">อัปเดตช่วงวันที่เรียบร้อย</div>
      </div>

      <div>
        <label for="memberSelect">เลือกชื่อของคุณ (หรือ Guest สำหรับเจ้าของทริป)</label>
        <select id="memberSelect"></select>
      </div>

      <div>
        <label>เลือกโหมดสถานะ แล้วจิ้มวันที่ด้านล่าง</label>
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

      <button class="btn-pri" id="saveBtn" ${isClosed ? 'disabled' : ''} onclick="submitDates()">${isClosed ? 'ทริปนี้ปิดไปแล้ว' : 'ตกลงบันทึกวันว่าง'}</button>
      <div class="msg" id="doneMsg">บันทึกเรียบร้อย! ส่งสรุปเข้ากลุ่ม LINE แล้ว</div>

      <div class="section">
        <div class="section-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7E63C4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ช่วงวันที่ทุกคนว่างตรงกัน (ติดกัน)
        </div>
        <div id="streaksBox"></div>
        <div style="border-top: 1px solid #E8E2F8; padding-top: 10px;">
          <label>หรือกำหนดวันเดินทางที่ตกลงกันแล้ว</label>
          <div class="date-row" style="margin-bottom: 8px;">
            <input type="date" id="lockStart" value="${params.startDate}" ${isClosed ? 'disabled' : ''} />
            <input type="date" id="lockEnd" value="${params.endDate}" ${isClosed ? 'disabled' : ''} />
          </div>
          <button class="btn-sec" style="width:100%;" id="lockCustomBtn" ${isClosed ? 'disabled' : ''} onclick="lockCustomDates()">ล็อกวันเดินทางตามนี้</button>
        </div>
        <div class="msg" id="lockMsg">ล็อกวันเดินทางเรียบร้อย! ส่งการ์ดเข้ากลุ่ม LINE แล้ว</div>
      </div>
    </div>
  </div>

  <script>
    const DATA = ${dataJson};
    const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    let currentMode = 'FREE';
    let selections = {};

    const selectEl = document.getElementById('memberSelect');
    DATA.members.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.isGuest ? m.displayName + ' (Guest - เจ้าของทริปลงแทน)' : m.displayName;
      selectEl.appendChild(opt);
    });

    function formatThaiRangeClient(startIso, endIso) {
      const s = new Date(startIso + 'T00:00:00Z');
      const e = new Date(endIso + 'T00:00:00Z');
      const sd = s.getUTCDate();
      const sm = THAI_MONTHS[s.getUTCMonth()];
      const ed = e.getUTCDate();
      const em = THAI_MONTHS[e.getUTCMonth()];
      if (startIso === endIso) return sd + ' ' + sm;
      if (s.getUTCMonth() === e.getUTCMonth()) return sd + '-' + ed + ' ' + sm;
      return sd + ' ' + sm + ' - ' + ed + ' ' + em;
    }

    function computeMutualStreaks() {
      const box = document.getElementById('streaksBox');
      box.innerHTML = '';
      if (!DATA.members.length) {
        box.innerHTML = '<div class="empty-note">ยังไม่มีสมาชิกในทริป</div>';
        return;
      }
      const lookup = new Map();
      DATA.records.forEach(r => lookup.set(r.memberId + ':' + r.date, r.status));
      const allDates = enumerate(DATA.startDate, DATA.endDate);
      const streaks = [];
      let curStart = null, curEnd = null, curCount = 0;

      for (const d of allDates) {
        const allFree = DATA.members.every(m => lookup.get(m.id + ':' + d) === 'FREE');
        if (allFree) {
          if (!curStart) curStart = d;
          curEnd = d;
          curCount++;
        } else if (curStart && curEnd) {
          streaks.push({ startDate: curStart, endDate: curEnd, daysCount: curCount });
          curStart = null; curEnd = null; curCount = 0;
        }
      }
      if (curStart && curEnd) {
        streaks.push({ startDate: curStart, endDate: curEnd, daysCount: curCount });
      }

      if (streaks.length === 0) {
        box.innerHTML = '<div class="empty-note">ยังไม่มีวันที่ทุกคนว่างตรงกัน 100% รอเพื่อนลงวันว่างให้ครบก่อนนะครับ</div>';
        return;
      }

      streaks.forEach(s => {
        const item = document.createElement('div');
        item.className = 'streak-item';
        const info = document.createElement('div');
        info.innerHTML = '<div class="streak-info">' + formatThaiRangeClient(s.startDate, s.endDate) + '</div><div class="streak-sub">ทุกคนว่างติดกัน ' + s.daysCount + ' วัน</div>';
        const btn = document.createElement('button');
        btn.className = 'btn-lock';
        btn.textContent = 'ล็อกวันช่วงนี้';
        btn.disabled = Boolean(DATA.isClosed);
        btn.onclick = () => lockTripDates(s.startDate, s.endDate);
        item.appendChild(info);
        item.appendChild(btn);
        box.appendChild(item);
      });
    }

    function loadMemberSelections() {
      const mId = Number(selectEl.value);
      selections = {};
      DATA.records.filter(r => r.memberId === mId).forEach(r => {
        selections[r.date] = r.status;
      });
      renderGrid();
      computeMutualStreaks();
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

    async function updatePollRange() {
      if (DATA.isClosed) return;
      const startDate = document.getElementById('rangeStart').value;
      const endDate = document.getElementById('rangeEnd').value;
      if (!startDate || !endDate || startDate > endDate) {
        alert('กรุณาเลือกวันเริ่มต้นให้น้อยกว่าหรือเท่ากับวันสิ้นสุดครับ');
        return;
      }
      const btn = document.getElementById('rangeBtn');
      btn.disabled = true;
      btn.textContent = 'กำลังอัปเดต...';
      const res = await fetch('/api/pick/range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId: DATA.pollId, startDate, endDate }),
      });
      btn.disabled = false;
      btn.textContent = 'อัปเดตช่วงวันที่สำรวจ';
      if (res.ok) {
        DATA.startDate = startDate;
        DATA.endDate = endDate;
        document.getElementById('headerBadge').textContent = DATA.tripName + ' • ' + formatThaiRangeClient(startDate, endDate);
        document.getElementById('rangeMsg').style.display = 'block';
        renderGrid();
        computeMutualStreaks();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'อัปเดตช่วงวันที่ไม่สำเร็จ');
      }
    }

    async function submitDates() {
      if (DATA.isClosed) return;
      const btn = document.getElementById('saveBtn');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';
      const mId = Number(selectEl.value);
      const entries = Object.entries(selections)
        .filter(([, st]) => st)
        .map(([date, status]) => ({ date, status }));

      const res = await fetch('/api/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pollId: DATA.pollId,
          memberId: mId,
          entries,
        }),
      });
      if (res.ok) {
        DATA.records = DATA.records.filter(r => r.memberId !== mId).concat(entries.map(e => ({ memberId: mId, date: e.date, status: e.status })));
        computeMutualStreaks();
        document.getElementById('doneMsg').style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'ตกลงบันทึกวันว่าง';
      } else {
        const err = await res.json().catch(() => ({}));
        btn.disabled = false;
        btn.textContent = err.error || 'ลองใหม่อีกครั้ง';
      }
    }

    async function lockTripDates(startDate, endDate) {
      if (DATA.isClosed) return;
      const res = await fetch('/api/trips/' + DATA.tripId + '/lock-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      if (res.ok) {
        document.getElementById('lockMsg').style.display = 'block';
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'ล็อกวันไม่สำเร็จ');
      }
    }

    function lockCustomDates() {
      const startDate = document.getElementById('lockStart').value;
      const endDate = document.getElementById('lockEnd').value;
      if (!startDate || !endDate || startDate > endDate) {
        alert('กรุณาเลือกช่วงวันเดินทางให้ถูกต้องครับ');
        return;
      }
      lockTripDates(startDate, endDate);
    }

    loadMemberSelections();
  </script>
</body>
</html>`;
}

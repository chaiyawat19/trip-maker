export function renderBillsLiffPage(params: {
  tripId: number;
  liffId: string;
}): string {
  const configJson = JSON.stringify({
    tripId: params.tripId,
    liffId: params.liffId,
  });

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>PromptPai — จัดการบิล &amp; QR พร้อมเพย์</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500&display=swap" rel="stylesheet" />
  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <style>
    :root {
      --lavender-haze: #D2C3F6;
      --velvet-grape: #36255C;
      --primary: #7E63C4;
      --lavender-tint: #F4F0FD;
      --border: #E8E2F8;
      --text-sec: #6B6280;
      --free-bg: #DCFCE7;
      --free-text: #16A34A;
      --maybe-bg: #FEF3C7;
      --maybe-text: #D97706;
      --busy-bg: #FEE2E2;
      --busy-text: #DC2626;
    }
    * { box-sizing: border-box; font-family: 'Kanit', sans-serif; font-weight: 400; -webkit-tap-highlight-color: transparent; }
    body { margin: 0; background: var(--lavender-tint); color: var(--velvet-grape); padding-bottom: 40px; }
    .topbar {
      background: #FFFFFF;
      border-bottom: 1px solid var(--border);
      padding: 14px 16px 10px;
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .topbar-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .brand { display: flex; align-items: center; gap: 8px; }
    .brand-icon {
      width: 30px; height: 30px; border-radius: 10px; background: var(--lavender-haze);
      display: flex; align-items: center; justify-content: center; color: var(--velvet-grape);
    }
    .trip-title { font-size: 16px; font-weight: 500; color: var(--velvet-grape); margin: 0; }
    .trip-sub { font-size: 11px; color: var(--text-sec); }
    .total-pill {
      background: var(--lavender-tint); border: 1px solid var(--border); color: var(--primary);
      padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap;
    }
    .tabs {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;
      background: var(--lavender-tint); padding: 4px; border-radius: 12px; margin-top: 12px;
    }
    .tab-btn {
      border: none; background: transparent; padding: 8px 4px; border-radius: 9px;
      font-size: 13px; color: var(--text-sec); cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 5px;
    }
    .tab-btn.active { background: #FFFFFF; color: var(--velvet-grape); font-weight: 500; box-shadow: 0 1px 4px rgba(54,37,92,0.08); }
    .container { max-width: 520px; margin: 0 auto; padding: 14px 14px 24px; }
    .card {
      background: #FFFFFF; border: 1px solid var(--border); border-radius: 18px;
      padding: 16px; margin-bottom: 12px; box-shadow: 0 4px 14px rgba(54,37,92,0.04);
    }
    .section-title { font-size: 14px; font-weight: 500; color: var(--velvet-grape); margin: 0 0 10px; display: flex; align-items: center; gap: 6px; }
    label { display: block; font-size: 12px; color: var(--text-sec); margin-bottom: 5px; font-weight: 500; }
    input[type="text"], input[type="number"], select {
      width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--lavender-haze);
      background: #FFFFFF; color: var(--velvet-grape); font-size: 14px; outline: none;
    }
    input:focus, select:focus { border-color: var(--primary); }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .mode-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px; }
    .mode-chip {
      border: 1px solid var(--border); background: var(--lavender-tint); color: var(--text-sec);
      padding: 9px 10px; border-radius: 12px; font-size: 13px; cursor: pointer; text-align: center;
    }
    .mode-chip.active { background: var(--primary); color: #FFFFFF; border-color: var(--primary); font-weight: 500; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .chip {
      border: 1px solid var(--border); background: #FFFFFF; color: var(--text-sec);
      padding: 5px 11px; border-radius: 999px; font-size: 12px; cursor: pointer;
    }
    .chip.selected { background: var(--lavender-haze); color: var(--velvet-grape); border-color: var(--primary); font-weight: 500; }
    .subcard {
      background: var(--lavender-tint); border: 1px solid var(--border); border-radius: 14px;
      padding: 12px; margin-bottom: 10px;
    }
    .subcard-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .btn-icon {
      border: none; background: transparent; color: var(--busy-text); cursor: pointer;
      padding: 4px 6px; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;
    }
    .btn-pri {
      width: 100%; padding: 12px; border-radius: 14px; border: none; background: var(--primary);
      color: #FFFFFF; font-size: 15px; font-weight: 500; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-pri:disabled { opacity: 0.6; cursor: wait; }
    .btn-sec {
      padding: 9px 12px; border-radius: 12px; border: 1px solid var(--lavender-haze);
      background: #FFFFFF; color: var(--velvet-grape); font-size: 13px; font-weight: 500;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .preview-box {
      background: var(--lavender-tint); border: 1px solid var(--lavender-haze);
      border-radius: 14px; padding: 12px; margin: 12px 0;
    }
    .preview-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
    .preview-total {
      display: flex; justify-content: space-between; font-size: 15px; font-weight: 500;
      border-top: 1px solid var(--lavender-haze); margin-top: 6px; padding-top: 8px; color: var(--velvet-grape);
    }
    .bill-item { border-bottom: 1px solid var(--border); padding: 12px 0; }
    .bill-item:last-child { border-bottom: none; padding-bottom: 0; }
    .badge {
      display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px;
      background: var(--lavender-tint); color: var(--primary); font-weight: 500;
    }
    .badge.CONFIRMED { background: var(--free-bg); color: var(--free-text); }
    .badge.WAITING_CONFIRM { background: var(--maybe-bg); color: var(--maybe-text); }
    .badge.PENDING { background: var(--lavender-tint); color: var(--primary); }
    .transfer-card {
      background: #FFFFFF; border: 1px solid var(--border); border-radius: 16px;
      padding: 14px; margin-bottom: 10px;
    }
    .transfer-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .transfer-actions { display: flex; gap: 8px; margin-top: 10px; }
    .transfer-actions button { flex: 1; }
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(54,37,92,0.55); z-index: 50;
      display: none; align-items: center; justify-content: center; padding: 16px;
    }
    .modal-backdrop.open { display: flex; }
    .modal {
      width: 100%; max-width: 360px; background: #FFFFFF; border-radius: 22px;
      padding: 20px; text-align: center; box-shadow: 0 18px 40px rgba(54,37,92,0.25);
    }
    .qr-img { width: 220px; height: 220px; border: 1px solid var(--border); border-radius: 16px; padding: 8px; margin: 10px auto; display: block; background: #FFFFFF; }
    .toast {
      position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
      background: var(--velvet-grape); color: #FFFFFF; padding: 10px 16px;
      border-radius: 999px; font-size: 13px; display: none; z-index: 60; white-space: nowrap;
    }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-row">
      <div class="brand">
        <div class="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>
        </div>
        <div>
          <h1 class="trip-title" id="tripName">กำลังโหลดทริป...</h1>
          <div class="trip-sub" id="tripSub">PromptPai • จัดการบิลและพร้อมเพย์</div>
        </div>
      </div>
      <div class="total-pill" id="totalSpendPill">0 ฿</div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" id="tabBtn-add" onclick="switchTab('add')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        จดบิลใหม่
      </button>
      <button class="tab-btn" id="tabBtn-bills" onclick="switchTab('bills')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
        บิลทั้งหมด
      </button>
      <button class="tab-btn" id="tabBtn-settle" onclick="switchTab('settle')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3h-3M14 20h7"/></svg>
        สรุป &amp; QR
      </button>
    </div>
  </div>

  <div class="container">
    <!-- TAB 1: ADD BILL -->
    <div id="tab-add">
      <div class="card">
        <div class="section-title">ข้อมูลบิล</div>
        <div style="margin-bottom: 10px;">
          <label for="billTitle">ชื่อรายการ</label>
          <input type="text" id="billTitle" placeholder="เช่น ค่าข้าวเย็น, ค่ารถตู้, ปิ้งย่าง" />
        </div>
        <div style="margin-bottom: 12px;">
          <label for="payerSelect">คนสำรองจ่าย</label>
          <select id="payerSelect"></select>
        </div>

        <label>รูปแบบการหาร</label>
        <div class="mode-grid">
          <div class="mode-chip active" id="mode-EQUAL" onclick="setSplitMode('EQUAL')">หารเท่า</div>
          <div class="mode-chip" id="mode-BASE_ADDON" onclick="setSplitMode('BASE_ADDON')">หารรวม + เพิ่ม</div>
          <div class="mode-chip" id="mode-ITEMIZED" onclick="setSplitMode('ITEMIZED')">หารแยกทีละเมนู</div>
          <div class="mode-chip" id="mode-EXACT" onclick="setSplitMode('EXACT')">กำหนดยอดเอง</div>
        </div>

        <!-- EQUAL / BASE_ADDON -->
        <div id="section-base">
          <div style="margin-bottom: 10px;">
            <label for="baseAmount">ยอดหลัก (บาท)</label>
            <input type="number" id="baseAmount" min="0" step="1" placeholder="0" oninput="updatePreview()" />
          </div>
          <div style="margin-bottom: 10px;">
            <label>คนหารยอดหลัก</label>
            <div class="chips" id="baseChips"></div>
          </div>
        </div>

        <!-- BASE_ADDON addons -->
        <div id="section-addons" class="hidden">
          <div id="addonsList"></div>
          <button type="button" class="btn-sec" style="width:100%; margin-bottom: 10px;" onclick="addAddonRow()">+ เพิ่มรายการพิเศษ (เช่น เบียร์ / เครื่องดื่ม)</button>
        </div>

        <!-- ITEMIZED -->
        <div id="section-itemized" class="hidden">
          <div id="itemsList"></div>
          <button type="button" class="btn-sec" style="width:100%; margin-bottom: 10px;" onclick="addItemRow()">+ เพิ่มเมนู / รายการ</button>
        </div>

        <!-- EXACT -->
        <div id="section-exact" class="hidden">
          <label>กรอกยอดของแต่ละคน (บาท)</label>
          <div id="exactList" style="display:flex; flex-direction:column; gap:8px; margin-bottom:10px;"></div>
        </div>

        <div class="row-3" style="margin-top: 8px;">
          <div>
            <label for="vatInput">VAT (%)</label>
            <input type="number" id="vatInput" value="0" min="0" step="0.5" oninput="updatePreview()" />
          </div>
          <div>
            <label for="scInput">SC (%)</label>
            <input type="number" id="scInput" value="0" min="0" step="0.5" oninput="updatePreview()" />
          </div>
          <div>
            <label for="discountInput">ส่วนลด (฿)</label>
            <input type="number" id="discountInput" value="0" min="0" step="1" oninput="updatePreview()" />
          </div>
        </div>

        <div class="preview-box" id="previewBox">
          <div style="font-size:12px; color:var(--text-sec); margin-bottom:6px; font-weight:500;">ตัวอย่างยอดหารต่อคน</div>
          <div id="previewRows"></div>
          <div class="preview-total">
            <span>ยอดสุทธิทั้งบิล</span>
            <span id="previewGrandTotal">0 ฿</span>
          </div>
        </div>

        <button type="button" class="btn-pri" id="saveBillBtn" onclick="submitBill()">
          บันทึกบิล &amp; ส่งสรุปเข้ากลุ่ม
        </button>
      </div>
    </div>

    <!-- TAB 2: BILLS LIST -->
    <div id="tab-bills" class="hidden">
      <div class="card" id="billsContainer">
        <div style="font-size:13px; color:var(--text-sec);">กำลังโหลดรายการบิล...</div>
      </div>
    </div>

    <!-- TAB 3: SETTLEMENT & PROMPTPAY QR -->
    <div id="tab-settle" class="hidden">
      <div class="card">
        <div class="section-title">ผูกพร้อมเพย์ของฉัน</div>
        <div style="margin-bottom:8px;">
          <label for="ppMemberSelect">สมาชิก</label>
          <select id="ppMemberSelect" onchange="onPpMemberChange()"></select>
        </div>
        <div style="margin-bottom:10px;">
          <label for="ppInput">เบอร์มือถือ (10 หลัก) หรือ เลขบัตรประชาชน (13 หลัก)</label>
          <input type="text" id="ppInput" placeholder="เช่น 0812345678" />
          <div id="ppSavedHint" style="font-size:11px; color:var(--primary); margin-top:4px;"></div>
        </div>
        <button type="button" class="btn-sec" style="width:100%;" onclick="savePromptPay()">บันทึกพร้อมเพย์</button>
      </div>

      <div id="transfersContainer"></div>
    </div>
  </div>

  <!-- QR MODAL -->
  <div class="modal-backdrop" id="qrModal" onclick="if(event.target===this) closeQrModal()">
    <div class="modal">
      <div style="font-size:12px; color:var(--primary); font-weight:500;">สแกนจ่ายผ่านพร้อมเพย์</div>
      <div style="font-size:17px; font-weight:500; margin-top:4px;" id="qrRecipientName">-</div>
      <div style="font-size:12px; color:var(--text-sec);" id="qrMaskedPp">-</div>
      <img id="qrImage" class="qr-img" src="" alt="PromptPay QR" />
      <div style="font-size:22px; font-weight:500; color:var(--primary); margin-bottom:4px;" id="qrAmountText">0 ฿</div>
      <div style="font-size:11px; color:var(--text-sec); margin-bottom:14px;">เปิดแอปธนาคารแล้วสแกน QR นี้ ยอดเงินจะกรอกให้อัตโนมัติ</div>
      <button type="button" class="btn-pri" onclick="closeQrModal()">ปิดหน้าต่าง</button>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const CONFIG = ${configJson};
    let STATE = { trip: null, members: [], bills: [], transfers: [] };
    let LIFF_USER_ID = null;
    let SPLIT_MODE = 'EQUAL';
    let baseParticipants = new Set();
    let addons = [];
    let itemizedRows = [];
    let exactValues = {};

    function showToast(msg) {
      const el = document.getElementById('toast');
      el.textContent = msg;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 2400);
    }

    function resolveTripIdFromUrl() {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get('tripId')) return Number(qs.get('tripId'));
      const liffState = qs.get('liff.state');
      if (liffState) {
        const inner = new URLSearchParams(liffState.startsWith('?') ? liffState.slice(1) : liffState);
        if (inner.get('tripId')) return Number(inner.get('tripId'));
      }
      return CONFIG.tripId;
    }

    async function initApp() {
      if (CONFIG.liffId && window.liff) {
        try {
          await window.liff.init({ liffId: CONFIG.liffId });
          if (window.liff.isLoggedIn()) {
            const prof = await window.liff.getProfile();
            LIFF_USER_ID = prof.userId;
          }
        } catch (err) {
          console.warn('LIFF init skipped:', err);
        }
      }
      await loadState();
    }

    async function loadState() {
      const tripId = resolveTripIdFromUrl();
      if (!tripId) {
        document.getElementById('tripName').textContent = 'ไม่พบข้อมูลทริป';
        return;
      }
      CONFIG.tripId = tripId;
      const res = await fetch('/api/trips/' + tripId + '/bills-state');
      if (!res.ok) {
        document.getElementById('tripName').textContent = 'โหลดข้อมูลไม่สำเร็จ';
        return;
      }
      STATE = await res.json();
      renderHeader();
      initFormMembers();
      renderBillsList();
      renderSettlements();
      updatePreview();
    }

    function renderHeader() {
      document.getElementById('tripName').textContent = STATE.trip.name;
      const total = STATE.bills.reduce((s, b) => s + b.totalAmount, 0);
      document.getElementById('totalSpendPill').textContent = total.toLocaleString() + ' ฿';
      const statusMap = { PLANNING: 'กำลังนัดวัน', LOCKED: 'กำลังเที่ยว/หารเงิน', COMPLETED: 'ปิดทริปแล้ว' };
      document.getElementById('tripSub').textContent = (statusMap[STATE.trip.status] || STATE.trip.status) + ' • ' + STATE.members.length + ' คน';
    }

    function initFormMembers() {
      const payerSel = document.getElementById('payerSelect');
      const ppSel = document.getElementById('ppMemberSelect');
      const prevPayer = payerSel.value;
      payerSel.innerHTML = '';
      ppSel.innerHTML = '';

      let defaultMemberId = STATE.members[0]?.id;
      if (LIFF_USER_ID) {
        const me = STATE.members.find(m => m.lineUserId === LIFF_USER_ID);
        if (me) defaultMemberId = me.id;
      }

      STATE.members.forEach(m => {
        const o1 = document.createElement('option');
        o1.value = m.id;
        o1.textContent = m.displayName + (m.isGuest ? ' (Guest)' : '');
        payerSel.appendChild(o1);

        if (!m.isGuest) {
          const o2 = document.createElement('option');
          o2.value = m.id;
          o2.textContent = m.displayName;
          ppSel.appendChild(o2);
        }
      });

      if (prevPayer) payerSel.value = prevPayer;
      else if (defaultMemberId) payerSel.value = String(defaultMemberId);

      if (defaultMemberId && !STATE.members.find(m => m.id === defaultMemberId)?.isGuest) {
        ppSel.value = String(defaultMemberId);
      }
      onPpMemberChange();

      if (baseParticipants.size === 0) {
        STATE.members.forEach(m => baseParticipants.add(m.id));
      }
      renderBaseChips();
      renderExactInputs();
      if (itemizedRows.length === 0) {
        itemizedRows = [{ name: '', amount: '', participants: new Set(STATE.members.map(m => m.id)) }];
      }
      renderItemizedRows();
    }

    function switchTab(tab) {
      ['add', 'bills', 'settle'].forEach(t => {
        document.getElementById('tab-' + t).classList.toggle('hidden', t !== tab);
        document.getElementById('tabBtn-' + t).classList.toggle('active', t === tab);
      });
    }

    function setSplitMode(mode) {
      SPLIT_MODE = mode;
      ['EQUAL', 'BASE_ADDON', 'ITEMIZED', 'EXACT'].forEach(m => {
        document.getElementById('mode-' + m).classList.toggle('active', m === mode);
      });
      document.getElementById('section-base').classList.toggle('hidden', mode !== 'EQUAL' && mode !== 'BASE_ADDON');
      document.getElementById('section-addons').classList.toggle('hidden', mode !== 'BASE_ADDON');
      document.getElementById('section-itemized').classList.toggle('hidden', mode !== 'ITEMIZED');
      document.getElementById('section-exact').classList.toggle('hidden', mode !== 'EXACT');

      if (mode === 'BASE_ADDON' && addons.length === 0) addAddonRow();
      updatePreview();
    }

    function renderBaseChips() {
      const box = document.getElementById('baseChips');
      box.innerHTML = '';
      STATE.members.forEach(m => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip ' + (baseParticipants.has(m.id) ? 'selected' : '');
        btn.textContent = m.displayName;
        btn.onclick = () => {
          if (baseParticipants.has(m.id)) baseParticipants.delete(m.id);
          else baseParticipants.add(m.id);
          renderBaseChips();
          updatePreview();
        };
        box.appendChild(btn);
      });
    }

    function addAddonRow() {
      addons.push({ name: '', amount: '', participants: new Set(STATE.members.map(m => m.id)) });
      renderAddons();
      updatePreview();
    }

    function renderAddons() {
      const box = document.getElementById('addonsList');
      box.innerHTML = '';
      addons.forEach((a, idx) => {
        const div = document.createElement('div');
        div.className = 'subcard';
        div.innerHTML = \`
          <div class="subcard-head">
            <span style="font-size:12px; font-weight:500;">รายการเพิ่ม #\${idx + 1}</span>
            <button type="button" class="btn-icon" onclick="addons.splice(\${idx},1); renderAddons(); updatePreview();">ลบ</button>
          </div>
          <div class="row-2" style="margin-bottom:8px;">
            <input type="text" placeholder="เช่น เบียร์ / ไวน์" value="\${a.name}" oninput="addons[\${idx}].name=this.value" />
            <input type="number" min="0" placeholder="จำนวนเงิน" value="\${a.amount}" oninput="addons[\${idx}].amount=this.value; updatePreview();" />
          </div>
          <div class="chips" id="addonChips-\${idx}"></div>
        \`;
        box.appendChild(div);
        const chipsBox = div.querySelector('#addonChips-' + idx);
        STATE.members.forEach(m => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chip ' + (a.participants.has(m.id) ? 'selected' : '');
          btn.textContent = m.displayName;
          btn.onclick = () => {
            if (a.participants.has(m.id)) a.participants.delete(m.id);
            else a.participants.add(m.id);
            renderAddons();
            updatePreview();
          };
          chipsBox.appendChild(btn);
        });
      });
    }

    function addItemRow() {
      itemizedRows.push({ name: '', amount: '', participants: new Set(STATE.members.map(m => m.id)) });
      renderItemizedRows();
      updatePreview();
    }

    function renderItemizedRows() {
      const box = document.getElementById('itemsList');
      box.innerHTML = '';
      itemizedRows.forEach((it, idx) => {
        const div = document.createElement('div');
        div.className = 'subcard';
        div.innerHTML = \`
          <div class="subcard-head">
            <span style="font-size:12px; font-weight:500;">เมนูที่ \${idx + 1}</span>
            <button type="button" class="btn-icon" onclick="itemizedRows.splice(\${idx},1); renderItemizedRows(); updatePreview();">ลบ</button>
          </div>
          <div class="row-2" style="margin-bottom:8px;">
            <input type="text" placeholder="ชื่อเมนู" value="\${it.name}" oninput="itemizedRows[\${idx}].name=this.value" />
            <input type="number" min="0" placeholder="ราคา" value="\${it.amount}" oninput="itemizedRows[\${idx}].amount=this.value; updatePreview();" />
          </div>
          <div class="chips" id="itemChips-\${idx}"></div>
        \`;
        box.appendChild(div);
        const chipsBox = div.querySelector('#itemChips-' + idx);
        STATE.members.forEach(m => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'chip ' + (it.participants.has(m.id) ? 'selected' : '');
          btn.textContent = m.displayName;
          btn.onclick = () => {
            if (it.participants.has(m.id)) it.participants.delete(m.id);
            else it.participants.add(m.id);
            renderItemizedRows();
            updatePreview();
          };
          chipsBox.appendChild(btn);
        });
      });
    }

    function renderExactInputs() {
      const box = document.getElementById('exactList');
      box.innerHTML = '';
      STATE.members.forEach(m => {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.innerHTML = \`
          <span style="flex:1; font-size:13px;">\${m.displayName}</span>
          <input type="number" min="0" style="width:130px;" placeholder="0" value="\${exactValues[m.id] || ''}" oninput="exactValues[\${m.id}]=this.value; updatePreview();" />
        \`;
        box.appendChild(row);
      });
    }

    function buildItemsPayload() {
      if (SPLIT_MODE === 'EQUAL' || SPLIT_MODE === 'BASE_ADDON') {
        const baseAmt = Number(document.getElementById('baseAmount').value || 0);
        const items = [];
        if (baseAmt > 0) {
          items.push({
            name: document.getElementById('billTitle').value.trim() || 'ยอดหลัก',
            amount: baseAmt,
            isAddon: false,
            participantIds: Array.from(baseParticipants),
          });
        }
        if (SPLIT_MODE === 'BASE_ADDON') {
          addons.forEach((a, i) => {
            const amt = Number(a.amount || 0);
            if (amt > 0) {
              items.push({
                name: (a.name || '').trim() || ('รายการเพิ่ม #' + (i + 1)),
                amount: amt,
                isAddon: true,
                participantIds: Array.from(a.participants),
              });
            }
          });
        }
        return items;
      }
      if (SPLIT_MODE === 'ITEMIZED') {
        return itemizedRows
          .filter(it => Number(it.amount || 0) > 0)
          .map((it, i) => ({
            name: (it.name || '').trim() || ('เมนู #' + (i + 1)),
            amount: Number(it.amount || 0),
            isAddon: false,
            participantIds: Array.from(it.participants),
          }));
      }
      // EXACT
      const exactAmounts = {};
      const participantIds = [];
      let total = 0;
      STATE.members.forEach(m => {
        const val = Number(exactValues[m.id] || 0);
        if (val > 0) {
          exactAmounts[m.id] = val;
          participantIds.push(m.id);
          total += val;
        }
      });
      if (total <= 0) return [];
      return [{
        name: document.getElementById('billTitle').value.trim() || 'กำหนดยอดเอง',
        amount: total,
        isAddon: false,
        participantIds,
        exactAmounts,
      }];
    }

    function computePreview(items, vatPct, scPct, discount) {
      const subtotals = new Map();
      items.forEach(it => {
        if (it.exactAmounts) {
          Object.entries(it.exactAmounts).forEach(([mId, amt]) => {
            subtotals.set(Number(mId), (subtotals.get(Number(mId)) || 0) + amt);
          });
          return;
        }
        const cnt = it.participantIds.length;
        if (!cnt) return;
        const per = it.amount / cnt;
        it.participantIds.forEach(mId => subtotals.set(mId, (subtotals.get(mId) || 0) + per));
      });
      const subtotal = Array.from(subtotals.values()).reduce((s, v) => s + v, 0);
      const afterDisc = Math.max(0, subtotal - discount);
      const sc = afterDisc * (scPct / 100);
      const vat = (afterDisc + sc) * (vatPct / 100);
      const grandTotal = Math.round(afterDisc + sc + vat);
      const shares = Array.from(subtotals.entries()).map(([memberId, sub]) => ({
        memberId,
        netTotal: subtotal > 0 ? Math.round(grandTotal * (sub / subtotal)) : 0,
      }));
      return { grandTotal, shares };
    }

    function updatePreview() {
      const items = buildItemsPayload();
      const vatPct = Number(document.getElementById('vatInput').value || 0);
      const scPct = Number(document.getElementById('scInput').value || 0);
      const discount = Number(document.getElementById('discountInput').value || 0);
      const { grandTotal, shares } = computePreview(items, vatPct, scPct, discount);

      const memberMap = new Map(STATE.members.map(m => [m.id, m.displayName]));
      const rowsEl = document.getElementById('previewRows');
      rowsEl.innerHTML = shares.length === 0
        ? '<div style="font-size:12px; color:var(--text-sec);">กรอกจำนวนเงินเพื่อดูยอดต่อคน</div>'
        : shares.map(s => \`<div class="preview-row"><span>\${memberMap.get(s.memberId) || 'สมาชิก'}</span><span>\${s.netTotal.toLocaleString()} ฿</span></div>\`).join('');
      document.getElementById('previewGrandTotal').textContent = grandTotal.toLocaleString() + ' ฿';
    }

    async function submitBill() {
      const title = document.getElementById('billTitle').value.trim();
      const payerMemberId = Number(document.getElementById('payerSelect').value);
      const items = buildItemsPayload();
      if (!title) return showToast('กรุณาใส่ชื่อรายการบิล');
      if (items.length === 0) return showToast('กรุณาใส่จำนวนเงินและเลือกคนหาร');

      const btn = document.getElementById('saveBillBtn');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';

      try {
        const res = await fetch('/api/trips/' + CONFIG.tripId + '/bills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            payerMemberId,
            splitMode: SPLIT_MODE,
            items,
            vatPercent: Number(document.getElementById('vatInput').value || 0),
            serviceChargePercent: Number(document.getElementById('scInput').value || 0),
            discountAmount: Number(document.getElementById('discountInput').value || 0),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          showToast(err.error || 'บันทึกไม่สำเร็จ');
          return;
        }
        document.getElementById('billTitle').value = '';
        document.getElementById('baseAmount').value = '';
        addons = [];
        exactValues = {};
        renderAddons();
        renderExactInputs();
        await loadState();
        showToast('บันทึกบิลและส่งเข้ากลุ่ม LINE แล้ว');
        switchTab('bills');
      } finally {
        btn.disabled = false;
        btn.textContent = 'บันทึกบิล & ส่งสรุปเข้ากลุ่ม';
      }
    }

    function renderBillsList() {
      const box = document.getElementById('billsContainer');
      if (STATE.bills.length === 0) {
        box.innerHTML = '<div style="text-align:center; padding:18px; color:var(--text-sec); font-size:13px;">ยังไม่มีบิลในทริปนี้</div>';
        return;
      }
      const modeLabel = { EQUAL: 'หารเท่า', BASE_ADDON: 'หารรวม+เพิ่ม', ITEMIZED: 'หารแยก', EXACT: 'กำหนดเอง' };
      box.innerHTML = STATE.bills.map(b => \`
        <div class="bill-item">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div>
              <div style="font-size:15px; font-weight:500;">\${b.title}</div>
              <div style="font-size:12px; color:var(--text-sec); margin-top:2px;">
                <span class="badge">\${modeLabel[b.splitMode] || b.splitMode}</span>
                สำรองจ่ายโดย \${b.payerName}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:500; color:var(--primary);">\${b.totalAmount.toLocaleString()} ฿</div>
              <button type="button" class="btn-icon" onclick="deleteBill(\${b.id})">ลบบิล</button>
            </div>
          </div>
          <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:6px;">
            \${b.shares.map(s => \`<span style="font-size:11px; background:var(--lavender-tint); padding:2px 8px; border-radius:8px;">\${s.displayName}: \${s.netTotal.toLocaleString()} ฿</span>\`).join('')}
          </div>
        </div>
      \`).join('');
    }

    async function deleteBill(billId) {
      if (!confirm('ต้องการลบบิลนี้ใช่ไหม?')) return;
      const res = await fetch('/api/trips/' + CONFIG.tripId + '/bills/' + billId, { method: 'DELETE' });
      if (res.ok) {
        showToast('ลบบิลเรียบร้อย');
        await loadState();
      } else {
        showToast('ลบบิลไม่สำเร็จ');
      }
    }

    function renderSettlements() {
      const box = document.getElementById('transfersContainer');
      if (STATE.transfers.length === 0) {
        box.innerHTML = '<div class="card" style="text-align:center; color:var(--text-sec); font-size:13px;">ไม่มียอดค้างโอนในทริปนี้</div>';
        return;
      }
      const statusText = { PENDING: 'รอโอน', WAITING_CONFIRM: 'รอยืนยันรับ', CONFIRMED: 'เคลียร์แล้ว' };
      const btnText = { PENDING: 'โอนแล้ว', WAITING_CONFIRM: 'ยืนยันรับเงิน', CONFIRMED: 'เคลียร์แล้ว' };

      box.innerHTML = STATE.transfers.map(t => \`
        <div class="transfer-card">
          <div class="transfer-top">
            <div>
              <div style="font-size:12px; color:var(--text-sec);">\${t.fromName} โอนให้ \${t.toName}</div>
              <div style="font-size:20px; font-weight:500; color:var(--velvet-grape);">\${t.amount.toLocaleString()} ฿</div>
            </div>
            <span class="badge \${t.status}">\${statusText[t.status] || t.status}</span>
          </div>
          <div class="transfer-actions">
            \${t.toPromptPay ? \`<button type="button" class="btn-sec" onclick="openQrModal('\${t.toName}', '\${t.toPromptPay}', '\${t.toMaskedPromptPay}', \${t.amount})">ดู QR พร้อมเพย์</button>\` : \`<button type="button" class="btn-sec" disabled style="opacity:0.55;">ยังไม่ผูกพร้อมเพย์</button>\`}
            <button type="button" class="btn-pri" style="padding:9px; font-size:13px;" onclick="toggleSettlement(\${t.settlementId})">\${btnText[t.status] || 'อัปเดตสถานะ'}</button>
          </div>
        </div>
      \`).join('');
    }

    async function toggleSettlement(settlementId) {
      const res = await fetch('/api/trips/' + CONFIG.tripId + '/settlements/' + settlementId + '/toggle', { method: 'POST' });
      if (res.ok) {
        await loadState();
        showToast('อัปเดตสถานะโอนเงินแล้ว');
      }
    }

    function onPpMemberChange() {
      const mId = Number(document.getElementById('ppMemberSelect').value);
      const member = STATE.members.find(m => m.id === mId);
      const hint = document.getElementById('ppSavedHint');
      if (member && member.maskedPromptPay) {
        hint.textContent = 'ผูกไว้แล้ว: ' + member.maskedPromptPay;
      } else {
        hint.textContent = 'ยังไม่ได้ผูกพร้อมเพย์';
      }
    }

    async function savePromptPay() {
      const mId = Number(document.getElementById('ppMemberSelect').value);
      const member = STATE.members.find(m => m.id === mId);
      const pp = document.getElementById('ppInput').value.trim();
      if (!member || !member.lineUserId) return showToast('ไม่พบข้อมูลผู้ใช้ LINE');
      const res = await fetch('/api/promptpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: member.lineUserId, promptpayId: pp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return showToast(err.error || 'รูปแบบพร้อมเพย์ไม่ถูกต้อง');
      }
      document.getElementById('ppInput').value = '';
      showToast('บันทึกพร้อมเพย์เรียบร้อย');
      await loadState();
    }

    function openQrModal(name, promptpay, masked, amount) {
      document.getElementById('qrRecipientName').textContent = name;
      document.getElementById('qrMaskedPp').textContent = 'พร้อมเพย์: ' + masked;
      document.getElementById('qrAmountText').textContent = amount.toLocaleString() + ' ฿';
      document.getElementById('qrImage').src = '/api/qr?promptpay=' + encodeURIComponent(promptpay) + '&amount=' + encodeURIComponent(amount);
      document.getElementById('qrModal').classList.add('open');
    }

    function closeQrModal() {
      document.getElementById('qrModal').classList.remove('open');
    }

    initApp();
  </script>
</body>
</html>`;
}

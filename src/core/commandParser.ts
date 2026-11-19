export type ParsedCommand =
  | { type: 'CREATE_TRIP'; name: string }
  | { type: 'RENAME_TRIP'; name: string }
  | { type: 'START_TRIP' }
  | { type: 'LIST_TRIPS' }
  | { type: 'JOIN_TRIP' }
  | { type: 'ADD_GUEST'; name: string }
  | { type: 'LIST_MEMBERS' }
  | { type: 'CLOSE_TRIP' }
  | { type: 'CREATE_POLL'; startDate: string; endDate: string; durationDays: number }
  | { type: 'SET_AVAILABILITY'; status: 'FREE' | 'MAYBE' | 'BUSY'; dates: string[] }
  | { type: 'SET_GUEST_AVAILABILITY'; guestName: string; status: 'FREE' | 'MAYBE' | 'BUSY'; dates: string[] }
  | { type: 'VIEW_AVAILABILITY' }
  | { type: 'REMIND_FRIENDS' }
  | {
      type: 'QUICK_SPLIT';
      title: string;
      baseAmount: number;
      baseMentions: string[];
      addons: Array<{ name: string; amount: number; mentions: string[] }>;
      exactShares: Record<string, number>;
      vatPercent: number;
      serviceChargePercent: number;
      discountAmount: number;
    }
  | {
      type: 'ITEMIZED_SPLIT';
      title: string;
      items: Array<{ name: string; amount: number; mentions: string[] }>;
      vatPercent: number;
      serviceChargePercent: number;
      discountAmount: number;
    }
  | { type: 'OPEN_BILL_BUILDER'; title: string }
  | { type: 'LIST_BILLS' }
  | { type: 'SETTLE_SUMMARY' }
  | { type: 'SET_PROMPTPAY'; promptpayId: string }
  | { type: 'HELP' }
  | { type: 'UNKNOWN' };

const THAI_MONTHS: Record<string, number> = {
  'ม.ค.': 1, 'มกรา': 1, 'มกราคม': 1,
  'ก.พ.': 2, 'กุมภา': 2, 'กุมภาพันธ์': 2,
  'มี.ค.': 3, 'มีนา': 3, 'มีนาคม': 3,
  'เม.ย.': 4, 'เมษา': 4, 'เมษายน': 4,
  'พ.ค.': 5, 'พฤษภา': 5, 'พฤษภาคม': 5,
  'มิ.ย.': 6, 'มิถุนา': 6, 'มิถุนายน': 6,
  'ก.ค.': 7, 'กรกฎา': 7, 'กรกฎาคม': 7,
  'ส.ค.': 8, 'สิงหา': 8, 'สิงหาคม': 8,
  'ก.ย.': 9, 'กันยา': 9, 'กันยายน': 9,
  'ต.ค.': 10, 'ตุลา': 10, 'ตุลาคม': 10,
  'พ.ย.': 11, 'พฤศจิกา': 11, 'พฤศจิกายน': 11,
  'ธ.ค.': 12, 'ธันวา': 12, 'ธันวาคม': 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function resolveMonth(token: string | undefined, fallbackMonth: number): number {
  if (!token) return fallbackMonth;
  return THAI_MONTHS[token] ?? fallbackMonth;
}

export function parseThaiDateRange(
  raw: string,
  refYear = 2026,
  refMonth = 12,
): { startDate: string; endDate: string } | null {
  const m = raw.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*([^\d\s]+)?/);
  if (m) {
    const d1 = Number(m[1]);
    const d2 = Number(m[2]);
    const month = resolveMonth(m[3], refMonth);
    return {
      startDate: `${refYear}-${pad2(month)}-${pad2(d1)}`,
      endDate: `${refYear}-${pad2(month)}-${pad2(d2)}`,
    };
  }
  const single = raw.match(/(\d{1,2})\s*([^\d\s]+)?/);
  if (single) {
    const d = Number(single[1]);
    const month = resolveMonth(single[2], refMonth);
    const iso = `${refYear}-${pad2(month)}-${pad2(d)}`;
    return { startDate: iso, endDate: iso };
  }
  return null;
}

export function parseCommand(text: string, refYear = 2026, refMonth = 12): ParsedCommand {
  const trimmed = text.trim().replace(/^@\S+\s+/, '');
  if (!trimmed.startsWith('/')) return { type: 'UNKNOWN' };

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0];
  const [cmd, ...restParts] = firstLine.split(/\s+/);
  const rest = restParts.join(' ').trim();

  switch (cmd) {
    case '/สร้างทริป':
      return rest ? { type: 'CREATE_TRIP', name: rest } : { type: 'HELP' };
    case '/เปลี่ยนชื่อทริป':
    case '/ตั้งชื่อทริป':
      return rest ? { type: 'RENAME_TRIP', name: rest } : { type: 'HELP' };
    case '/เริ่มทริป':
      return { type: 'START_TRIP' };
    case '/ทริป':
      return { type: 'LIST_TRIPS' };
    case '/เข้าทริป':
      return { type: 'JOIN_TRIP' };
    case '/เพิ่มคน':
      return rest ? { type: 'ADD_GUEST', name: rest } : { type: 'HELP' };
    case '/สมาชิก':
      return { type: 'LIST_MEMBERS' };
    case '/ปิดทริป':
      return { type: 'CLOSE_TRIP' };
    case '/วันว่าง':
      return { type: 'VIEW_AVAILABILITY' };
    case '/ตามเพื่อน':
      return { type: 'REMIND_FRIENDS' };
    case '/บิลทั้งหมด':
      return { type: 'LIST_BILLS' };
    case '/สรุปเงิน':
    case '/สรุปยอด':
    case '/เคลียร์ยอด':
      return { type: 'SETTLE_SUMMARY' };
    case '/พร้อมเพย์':
      return { type: 'SET_PROMPTPAY', promptpayId: rest };
    case '/วิธีใช้':
    case '/help':
      return { type: 'HELP' };
    case '/บิล':
      return { type: 'OPEN_BILL_BUILDER', title: rest || 'บิลใหม่' };
    case '/นัด': {
      const durMatch = rest.match(/(\d+)\s*วัน/);
      const durationDays = durMatch ? Number(durMatch[1]) : 1;
      const range = parseThaiDateRange(rest, refYear, refMonth);
      if (!range) return { type: 'HELP' };
      return { type: 'CREATE_POLL', ...range, durationDays };
    }
    case '/ว่าง':
    case '/ไม่ว่าง':
    case '/อาจจะ': {
      const status =
        cmd === '/ว่าง' ? 'FREE' : cmd === '/ไม่ว่าง' ? 'BUSY' : 'MAYBE';
      const dates: string[] = [];
      for (const seg of rest.split(',')) {
        const range = parseThaiDateRange(seg.trim(), refYear, refMonth);
        if (range) {
          const cur = new Date(`${range.startDate}T00:00:00Z`);
          const end = new Date(`${range.endDate}T00:00:00Z`);
          while (cur <= end) {
            dates.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
      }
      return { type: 'SET_AVAILABILITY', status, dates };
    }
    case '/ลงวันแทน': {
      const m = rest.match(/^(\S+)\s+(ว่าง|ไม่ว่าง|อาจจะ)\s+(.+)$/);
      if (!m) return { type: 'HELP' };
      const guestName = m[1].trim();
      const status = m[2] === 'ว่าง' ? 'FREE' : m[2] === 'ไม่ว่าง' ? 'BUSY' : 'MAYBE';
      const dates: string[] = [];
      for (const seg of m[3].split(',')) {
        const range = parseThaiDateRange(seg.trim(), refYear, refMonth);
        if (range) {
          const cur = new Date(`${range.startDate}T00:00:00Z`);
          const end = new Date(`${range.endDate}T00:00:00Z`);
          while (cur <= end) {
            dates.push(cur.toISOString().slice(0, 10));
            cur.setUTCDate(cur.getUTCDate() + 1);
          }
        }
      }
      return dates.length > 0 ? { type: 'SET_GUEST_AVAILABILITY', guestName, status, dates } : { type: 'HELP' };
    }
    case '/หาร':
      if (!rest) return { type: 'OPEN_BILL_BUILDER', title: 'จัดการบิล' };
      return parseQuickSplit(rest);
    case '/หารรวม':
    case '/หารเพิ่ม':
    case '/หารรวมเพิ่ม':
      return parseQuickSplit(rest);
    case '/หารเอง':
      return parseExactSplit(rest);
    case '/หารแยก':
      return parseItemizedSplit(rest || 'บิลหารแยก', lines.slice(1));
    default:
      return { type: 'UNKNOWN' };
  }
}

function extractModifiers(text: string) {
  let working = text;
  let vatPercent = 0;
  working = working.replace(/\+vat(\d+(?:\.\d+)?)?/gi, (_, num) => {
    vatPercent = num ? Number(num) : 7;
    return '';
  });

  let serviceChargePercent = 0;
  working = working.replace(/\+sc(\d+(?:\.\d+)?)?/gi, (_, num) => {
    serviceChargePercent = num ? Number(num) : 10;
    return '';
  });

  let discountAmount = 0;
  working = working.replace(/-(?:ส่วนลด\s*)?(\d+(?:\.\d+)?)/g, (_, num) => {
    discountAmount += Number(num);
    return '';
  });

  return { working: working.trim(), vatPercent, serviceChargePercent, discountAmount };
}

function parseQuickSplit(rest: string): ParsedCommand {
  const { working: modClean, vatPercent, serviceChargePercent, discountAmount } = extractModifiers(rest);
  let working = modClean;

  // Support both "+เบียร์ 400(@เอ @บี)" AND simpler "+เบียร์ 400 @เอ @บี"
  const addons: Array<{ name: string; amount: number; mentions: string[] }> = [];
  working = working.replace(/\+([^\s\d]+)\s+(\d+(?:\.\d+)?)\s*\(([^)]+)\)/g, (_, name, amt, people) => {
    const mentions = people
      .split(/\s+/)
      .map((s: string) => s.replace(/^@/, '').trim())
      .filter(Boolean);
    addons.push({ name, amount: Number(amt), mentions });
    return '';
  });

  // Simpler form without parentheses: "+เบียร์ 400 @เอ @บี" (until next + or end)
  working = working.replace(/\+([^\s\d]+)\s+(\d+(?:\.\d+)?)((?:\s+@[^\s]+)*)/g, (_, name, amt, people) => {
    const mentions = (people || '')
      .split(/\s+/)
      .map((s: string) => s.replace(/^@/, '').trim())
      .filter(Boolean);
    addons.push({ name, amount: Number(amt), mentions });
    return '';
  });

  const exactShares: Record<string, number> = {};
  working = working.replace(/@([^\s=]+)=(\d+(?:\.\d+)?)/g, (_, name, amt) => {
    exactShares[name.trim()] = Number(amt);
    return '';
  });

  const baseMentions: string[] = [];
  working = working.replace(/@([^\s]+)/g, (_, name) => {
    baseMentions.push(name.trim());
    return '';
  });

  const match = working.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
  if (!match) return { type: 'HELP' };

  return {
    type: 'QUICK_SPLIT',
    title: match[1].trim(),
    baseAmount: Number(match[2]),
    baseMentions,
    addons,
    exactShares,
    vatPercent,
    serviceChargePercent,
    discountAmount,
  };
}

function parseExactSplit(rest: string): ParsedCommand {
  const { working: modClean, vatPercent, serviceChargePercent, discountAmount } = extractModifiers(rest);
  let working = modClean;

  const exactShares: Record<string, number> = {};
  working = working.replace(/@([^\s=]+)=(\d+(?:\.\d+)?)/g, (_, name, amt) => {
    exactShares[name.trim()] = Number(amt);
    return '';
  });

  const title = working.trim();
  const baseAmount = Object.values(exactShares).reduce((s, v) => s + v, 0);
  if (!title || baseAmount <= 0) return { type: 'HELP' };

  return {
    type: 'QUICK_SPLIT',
    title,
    baseAmount,
    baseMentions: [],
    addons: [],
    exactShares,
    vatPercent,
    serviceChargePercent,
    discountAmount,
  };
}

function parseItemizedSplit(title: string, bodyLines: string[]): ParsedCommand {
  if (bodyLines.length === 0) return { type: 'HELP' };

  let vatPercent = 0;
  let serviceChargePercent = 0;
  let discountAmount = 0;
  const items: Array<{ name: string; amount: number; mentions: string[] }> = [];

  for (const line of bodyLines) {
    const mods = extractModifiers(line);
    if (mods.vatPercent > 0) vatPercent = mods.vatPercent;
    if (mods.serviceChargePercent > 0) serviceChargePercent = mods.serviceChargePercent;
    discountAmount += mods.discountAmount;

    if (!mods.working) continue;

    const mentions: string[] = [];
    const withoutMentions = mods.working.replace(/@([^\s]+)/g, (_, name) => {
      mentions.push(name.trim());
      return '';
    });

    const m = withoutMentions.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);
    if (m) {
      items.push({ name: m[1].trim(), amount: Number(m[2]), mentions });
    }
  }

  if (items.length === 0) return { type: 'HELP' };

  return {
    type: 'ITEMIZED_SPLIT',
    title,
    items,
    vatPercent,
    serviceChargePercent,
    discountAmount,
  };
}

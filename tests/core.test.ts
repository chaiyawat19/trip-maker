import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/core/commandParser.js';
import { calculateBill } from '../src/core/billCalculator.js';
import { rankDateWindows } from '../src/core/dateMatcher.js';
import { calculateSettlements } from '../src/core/settlementEngine.js';
import { getDueReminderKey, buildReminderText } from '../src/core/reminderEngine.js';
import {
  normalizePromptPayId,
  maskPromptPayId,
  generatePromptPayPayload,
} from '../src/core/promptpay.js';

describe('commandParser', () => {
  it('parses /สร้างทริป', () => {
    expect(parseCommand('/สร้างทริป เชียงใหม่')).toEqual({
      type: 'CREATE_TRIP',
      name: 'เชียงใหม่',
    });
  });

  it('parses /นัด with Thai date range and duration', () => {
    expect(parseCommand('/นัด 1-15 ธ.ค. 3วัน')).toEqual({
      type: 'CREATE_POLL',
      startDate: '2026-12-01',
      endDate: '2026-12-15',
      durationDays: 3,
    });
  });

  it('parses /ไม่ว่าง with multi-day range', () => {
    expect(parseCommand('/ไม่ว่าง 5-7 ธ.ค.')).toEqual({
      type: 'SET_AVAILABILITY',
      status: 'BUSY',
      dates: ['2026-12-05', '2026-12-06', '2026-12-07'],
    });
  });

  it('parses /ลงวันแทน for Guest availability by owner', () => {
    expect(parseCommand('/ลงวันแทน แฟนเอ ไม่ว่าง 5-7 ธ.ค.')).toEqual({
      type: 'SET_GUEST_AVAILABILITY',
      guestName: 'แฟนเอ',
      status: 'BUSY',
      dates: ['2026-12-05', '2026-12-06', '2026-12-07'],
    });
  });

  it('parses /เปลี่ยนชื่อทริป, /เริ่มทริป, /ปิดทริป, /สมาชิก, and /สรุปยอด', () => {
    expect(parseCommand('/เปลี่ยนชื่อทริป เกาะล้าน')).toEqual({ type: 'RENAME_TRIP', name: 'เกาะล้าน' });
    expect(parseCommand('/เริ่มทริป')).toEqual({ type: 'START_TRIP' });
    expect(parseCommand('/ปิดทริป')).toEqual({ type: 'CLOSE_TRIP' });
    expect(parseCommand('/สมาชิก')).toEqual({ type: 'LIST_MEMBERS' });
    expect(parseCommand('@PromptPai /สมาชิก')).toEqual({ type: 'LIST_MEMBERS' });
    expect(parseCommand('/สรุปยอด')).toEqual({ type: 'SETTLE_SUMMARY' });
  });

  it('parses /หารรวม and /หารเพิ่ม without parentheses', () => {
    expect(parseCommand('/หารรวม ค่ารถ 2000')).toEqual({
      type: 'QUICK_SPLIT',
      title: 'ค่ารถ',
      baseAmount: 2000,
      baseMentions: [],
      addons: [],
      exactShares: {},
      vatPercent: 0,
      serviceChargePercent: 0,
      discountAmount: 0,
    });

    expect(parseCommand('/หารเพิ่ม ค่าข้าว 1200 +เบียร์ 400 @เอ @บี +vat7')).toEqual({
      type: 'QUICK_SPLIT',
      title: 'ค่าข้าว',
      baseAmount: 1200,
      baseMentions: [],
      addons: [{ name: 'เบียร์', amount: 400, mentions: ['เอ', 'บี'] }],
      exactShares: {},
      vatPercent: 7,
      serviceChargePercent: 0,
      discountAmount: 0,
    });
  });

  it('parses /หารแยก multi-line itemized split and /หารเอง exact split', () => {
    expect(
      parseCommand('/หารแยก ปิ้งย่าง\nหมู 600 @เอ @บี\nเบียร์ 300 @บี\n+vat7'),
    ).toEqual({
      type: 'ITEMIZED_SPLIT',
      title: 'ปิ้งย่าง',
      items: [
        { name: 'หมู', amount: 600, mentions: ['เอ', 'บี'] },
        { name: 'เบียร์', amount: 300, mentions: ['บี'] },
      ],
      vatPercent: 7,
      serviceChargePercent: 0,
      discountAmount: 0,
    });

    expect(parseCommand('/หารเอง ค่าน้ำมัน @เอ=500 @บี=300')).toEqual({
      type: 'QUICK_SPLIT',
      title: 'ค่าน้ำมัน',
      baseAmount: 800,
      baseMentions: [],
      addons: [],
      exactShares: { เอ: 500, บี: 300 },
      vatPercent: 0,
      serviceChargePercent: 0,
      discountAmount: 0,
    });
  });

  it('parses /หาร with base + beer add-on + vat7', () => {
    expect(parseCommand('/หาร ค่าข้าว 1200 +เบียร์ 400(@เอ @บี) +vat7')).toEqual({
      type: 'QUICK_SPLIT',
      title: 'ค่าข้าว',
      baseAmount: 1200,
      baseMentions: [],
      addons: [{ name: 'เบียร์', amount: 400, mentions: ['เอ', 'บี'] }],
      exactShares: {},
      vatPercent: 7,
      serviceChargePercent: 0,
      discountAmount: 0,
    });
  });
});

describe('billCalculator', () => {
  it('calculates base + beer add-on + proportional VAT 7% accurately', () => {
    const res = calculateBill({
      items: [
        { name: 'ค่าข้าว', amount: 1200, participantIds: [1, 2, 3, 4] },
        { name: 'เบียร์', amount: 400, isAddon: true, participantIds: [1, 2] },
      ],
      vatPercent: 7,
    });

    expect(res.grandTotal).toBe(1712);
    const byId = Object.fromEntries(res.shares.map((s) => [s.memberId, s.netTotal]));
    expect(byId[1]).toBe(535);
    expect(byId[2]).toBe(535);
    expect(byId[3]).toBe(321);
    expect(byId[4]).toBe(321);
  });

  it('reconciles rounding difference so sum equals grandTotal', () => {
    const res = calculateBill({
      items: [{ name: 'ค่ากาแฟ', amount: 100, participantIds: [1, 2, 3] }],
    });
    expect(res.grandTotal).toBe(100);
    const sum = res.shares.reduce((s, r) => s + r.netTotal, 0);
    expect(sum).toBe(100);
  });
});

describe('dateMatcher', () => {
  it('ranks 3-day consecutive windows prioritizing 100% free tier 1', () => {
    const windows = rankDateWindows({
      startDate: '2026-12-01',
      endDate: '2026-12-06',
      durationDays: 3,
      memberIds: [1, 2],
      records: [
        { memberId: 1, date: '2026-12-01', status: 'BUSY' },
        { memberId: 1, date: '2026-12-02', status: 'FREE' },
        { memberId: 1, date: '2026-12-03', status: 'FREE' },
        { memberId: 1, date: '2026-12-04', status: 'FREE' },
        { memberId: 1, date: '2026-12-05', status: 'FREE' },
        { memberId: 1, date: '2026-12-06', status: 'FREE' },
        { memberId: 2, date: '2026-12-01', status: 'FREE' },
        { memberId: 2, date: '2026-12-02', status: 'MAYBE' },
        { memberId: 2, date: '2026-12-03', status: 'FREE' },
        { memberId: 2, date: '2026-12-04', status: 'FREE' },
        { memberId: 2, date: '2026-12-05', status: 'FREE' },
        { memberId: 2, date: '2026-12-06', status: 'FREE' },
      ],
    });

    expect(windows[0].startDate).toBe('2026-12-03');
    expect(windows[0].endDate).toBe('2026-12-05');
    expect(windows[0].tier).toBe(1);
  });
});

describe('settlementEngine', () => {
  it('simplifies debts across multiple bills into minimum transfers', () => {
    const res = calculateSettlements([
      {
        payerMemberId: 1,
        totalAmount: 1000,
        shares: [
          { memberId: 1, netTotal: 500 },
          { memberId: 2, netTotal: 500 },
        ],
      },
      {
        payerMemberId: 2,
        totalAmount: 600,
        shares: [
          { memberId: 2, netTotal: 300 },
          { memberId: 3, netTotal: 300 },
        ],
      },
    ]);

    // Net: 1 => +500, 2 => -200, 3 => -300
    expect(res.netBalances).toEqual({ 1: 500, 2: -200, 3: -300 });
    expect(res.transfers).toEqual([
      { fromMemberId: 3, toMemberId: 1, amount: 300 },
      { fromMemberId: 2, toMemberId: 1, amount: 200 },
    ]);
  });
});

describe('reminderEngine', () => {
  it('detects D-3, D-1, and D-0 reminders and formats Thai date range', () => {
    expect(getDueReminderKey('2026-12-12', '2026-12-09')).toBe('D-3');
    expect(getDueReminderKey('2026-12-12', '2026-12-11')).toBe('D-1');
    expect(getDueReminderKey('2026-12-12', '2026-12-12')).toBe('D-0');
    expect(getDueReminderKey('2026-12-12', '2026-12-10')).toBeNull();

    const msg = buildReminderText('เชียงใหม่', '2026-12-12', '2026-12-14', 'D-3');
    expect(msg).toContain('12-14 ธ.ค.');
    expect(msg).toContain('3 วัน');
  });
});

describe('promptpay & LIFF bill commands', () => {
  it('parses bare /หาร as OPEN_BILL_BUILDER and /พร้อมเพย์', () => {
    expect(parseCommand('/หาร')).toEqual({ type: 'OPEN_BILL_BUILDER', title: 'จัดการบิล' });
    expect(parseCommand('/พร้อมเพย์ 081-234-5678')).toEqual({
      type: 'SET_PROMPTPAY',
      promptpayId: '081-234-5678',
    });
  });

  it('normalizes, masks, and generates valid PromptPay EMVCo payload', () => {
    expect(normalizePromptPayId('081-234-5678')).toBe('0812345678');
    expect(normalizePromptPayId('12345')).toBeNull();
    expect(maskPromptPayId('0812345678')).toBe('081-xxx-5678');
    expect(maskPromptPayId('1234567890123')).toBe('1-xxxx-xxxxx-12-3');

    const payload = generatePromptPayPayload('081-234-5678', 350.5);
    expect(payload.startsWith('000201')).toBe(true);
    expect(payload).toContain('350.50');
  });

  it('parses /เริ่มทริป with optional dates and /ตั้งวัน', () => {
    expect(parseCommand('/เริ่มทริป 19-21 พ.ย.')).toEqual({
      type: 'START_TRIP',
      startDate: '2026-11-19',
      endDate: '2026-11-21',
    });
    expect(parseCommand('/ตั้งวัน 19-21 พ.ย.')).toEqual({
      type: 'SET_TRIP_DATES',
      startDate: '2026-11-19',
      endDate: '2026-11-21',
    });
  });
});

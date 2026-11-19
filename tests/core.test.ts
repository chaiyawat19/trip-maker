import { describe, it, expect } from 'vitest';
import { parseCommand } from '../src/core/commandParser.js';
import { calculateBill } from '../src/core/billCalculator.js';
import { rankDateWindows } from '../src/core/dateMatcher.js';
import { calculateSettlements } from '../src/core/settlementEngine.js';

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

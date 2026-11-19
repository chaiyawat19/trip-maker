export type SplitMode = 'EQUAL' | 'BASE_ADDON' | 'ITEMIZED' | 'EXACT';

export interface BillItemInput {
  name: string;
  amount: number;
  isAddon?: boolean;
  participantIds: number[];
  /** Used in EXACT mode: map of memberId -> exact amount */
  exactAmounts?: Record<number, number>;
}

export interface BillCalculationInput {
  items: BillItemInput[];
  serviceChargePercent?: number;
  vatPercent?: number;
  discountAmount?: number;
}

export interface MemberShareResult {
  memberId: number;
  subtotal: number;
  netTotal: number;
}

export interface BillCalculationResult {
  subtotal: number;
  serviceChargeAmount: number;
  vatAmount: number;
  discountAmount: number;
  grandTotal: number;
  shares: MemberShareResult[];
}

/**
 * Calculates per-member shares across Equal, Base+Add-on, Itemized, and Exact modes.
 * Distributes Service Charge, VAT, and Discounts proportionally based on each member's subtotal,
 * and adjusts rounding remainder so sum(netTotal) === grandTotal.
 */
export function calculateBill(input: BillCalculationInput): BillCalculationResult {
  const scPct = input.serviceChargePercent ?? 0;
  const vatPct = input.vatPercent ?? 0;
  const discount = input.discountAmount ?? 0;

  const memberSubtotals = new Map<number, number>();

  for (const item of input.items) {
    if (item.exactAmounts && Object.keys(item.exactAmounts).length > 0) {
      for (const [mIdStr, amt] of Object.entries(item.exactAmounts)) {
        const mId = Number(mIdStr);
        memberSubtotals.set(mId, (memberSubtotals.get(mId) ?? 0) + amt);
      }
      continue;
    }

    const count = item.participantIds.length;
    if (count === 0) continue;
    const perPerson = item.amount / count;
    for (const mId of item.participantIds) {
      memberSubtotals.set(mId, (memberSubtotals.get(mId) ?? 0) + perPerson);
    }
  }

  const subtotal = round2(
    Array.from(memberSubtotals.values()).reduce((sum, v) => sum + v, 0),
  );

  const afterDiscount = Math.max(0, subtotal - discount);
  const serviceChargeAmount = round2(afterDiscount * (scPct / 100));
  const vatBase = afterDiscount + serviceChargeAmount;
  const vatAmount = round2(vatBase * (vatPct / 100));
  const grandTotal = round2(vatBase + vatAmount);

  const rawShares: MemberShareResult[] = Array.from(memberSubtotals.entries()).map(
    ([memberId, sub]) => {
      const ratio = subtotal > 0 ? sub / subtotal : 0;
      return {
        memberId,
        subtotal: round2(sub),
        netTotal: Math.round(grandTotal * ratio),
      };
    },
  );

  // Fix integer rounding difference so total matches grandTotal (rounded to integer baht)
  const targetTotal = Math.round(grandTotal);
  const currentSum = rawShares.reduce((s, r) => s + r.netTotal, 0);
  let diff = targetTotal - currentSum;

  if (diff !== 0 && rawShares.length > 0) {
    // Sort descending by subtotal so largest spender absorbs +/- 1 baht rounding
    const sorted = [...rawShares].sort((a, b) => b.subtotal - a.subtotal);
    let idx = 0;
    while (diff !== 0) {
      const step = diff > 0 ? 1 : -1;
      sorted[idx % sorted.length].netTotal += step;
      diff -= step;
      idx++;
    }
  }

  return {
    subtotal,
    serviceChargeAmount,
    vatAmount,
    discountAmount: discount,
    grandTotal: targetTotal,
    shares: rawShares,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface BillSummaryForSettlement {
  payerMemberId: number;
  totalAmount: number;
  shares: Array<{ memberId: number; netTotal: number }>;
}

export interface TransferInstruction {
  fromMemberId: number;
  toMemberId: number;
  amount: number;
}

export interface SettlementResult {
  netBalances: Record<number, number>;
  transfers: TransferInstruction[];
}

/**
 * Computes net balances per member (+ means owed money, - means owes money)
 * and uses Greedy Debt Simplification to minimize the number of transfers.
 */
export function calculateSettlements(
  bills: BillSummaryForSettlement[],
): SettlementResult {
  const balances = new Map<number, number>();

  for (const bill of bills) {
    balances.set(
      bill.payerMemberId,
      (balances.get(bill.payerMemberId) ?? 0) + bill.totalAmount,
    );
    for (const share of bill.shares) {
      balances.set(
        share.memberId,
        (balances.get(share.memberId) ?? 0) - share.netTotal,
      );
    }
  }

  const debtors: Array<{ memberId: number; amount: number }> = [];
  const creditors: Array<{ memberId: number; amount: number }> = [];

  for (const [memberId, bal] of balances.entries()) {
    const rounded = Math.round(bal);
    if (rounded < 0) {
      debtors.push({ memberId, amount: Math.abs(rounded) });
    } else if (rounded > 0) {
      creditors.push({ memberId, amount: rounded });
    }
  }

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: TransferInstruction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: transferAmount,
      });
    }

    debtor.amount -= transferAmount;
    creditor.amount -= transferAmount;

    if (debtor.amount === 0) i++;
    if (creditor.amount === 0) j++;
  }

  const netBalances: Record<number, number> = {};
  for (const [k, v] of balances.entries()) {
    netBalances[k] = Math.round(v);
  }

  return { netBalances, transfers };
}

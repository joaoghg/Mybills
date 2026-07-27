import type { TransactionOutput } from '@mybills/dtos';

function toYmd(value: string): string {
  return value.slice(0, 10);
}

function compareYmd(a: string, b: string): number {
  const aa = toYmd(a);
  const bb = toYmd(b);
  if (aa === bb) return 0;
  return aa < bb ? -1 : 1;
}

export function sumUnpaidCardExpensesInRange(
  transactions: TransactionOutput[],
  cardId: string,
  start: string,
  end: string,
  todayYmd: string
): number {
  const startYmd = toYmd(start);
  const endYmd = toYmd(end);
  const today = toYmd(todayYmd);
  const effectiveEnd = compareYmd(endYmd, today) <= 0 ? endYmd : today;
  let sum = 0;
  for (const tx of transactions) {
    if (tx.cardId !== cardId) continue;
    if (tx.type !== 'EXPENSE') continue;
    if (tx.isPaid) continue;
    const txDate = toYmd(tx.date);
    if (compareYmd(txDate, startYmd) < 0) continue;
    if (compareYmd(txDate, effectiveEnd) > 0) continue;
    sum += tx.amount;
  }
  return sum;
}

export function sumUnpaidCardExpensesAllTime(
  transactions: TransactionOutput[],
  cardId: string
): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.cardId !== cardId) continue;
    if (tx.type !== 'EXPENSE') continue;
    if (tx.isPaid) continue;
    sum += tx.amount;
  }
  return sum;
}

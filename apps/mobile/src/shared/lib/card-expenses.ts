import type { TransactionOutput } from '@mybills/dtos';

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function sumUnpaidCardExpensesInRange(
  transactions: TransactionOutput[],
  cardId: string,
  start: string,
  end: string,
  todayYmd: string
): number {
  const effectiveEnd = compareYmd(end, todayYmd) <= 0 ? end : todayYmd;
  let sum = 0;
  for (const tx of transactions) {
    if (tx.cardId !== cardId) continue;
    if (tx.type !== 'EXPENSE') continue;
    if (tx.isPaid) continue;
    if (compareYmd(tx.date, start) < 0) continue;
    if (compareYmd(tx.date, effectiveEnd) > 0) continue;
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

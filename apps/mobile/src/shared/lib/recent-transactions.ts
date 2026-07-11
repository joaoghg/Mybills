import type { CategoryIcon, TransactionOutput } from '@mybills/dtos';

import type { RecentAmountVariant, RecentTransactionRow } from '@/shared/types/recent-transaction';
import { centsToMajor } from '@/shared/utils/cents-to-major';
import { ymdFromLocalDate } from '@/shared/lib/billing-cycle';

export type RecentTimeLabels = {
  todayAt: (time: string) => string;
  yesterdayAt: (time: string) => string;
};

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function pickCategoryIcon(categoryName: string | undefined): CategoryIcon {
  const n = (categoryName ?? '').toLowerCase();
  if (/(food|restaurant|lunch|almoço|jantar|pizza)/i.test(n)) return 'restaurant-outline';
  if (/(market|grocery|super|mercado)/i.test(n)) return 'cart-outline';
  return 'receipt-outline';
}

function formatTimeFromIso(iso: string, locale: string): string {
  const date = new Date(iso);
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return '';
  }
}

export function formatRecentTimeLabel(
  txDate: string,
  createdAt: string,
  locale: string,
  labels: RecentTimeLabels
): string {
  const todayYmd = ymdFromLocalDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYmd = ymdFromLocalDate(yesterday);
  const time = formatTimeFromIso(createdAt, locale);

  if (txDate === todayYmd) {
    return labels.todayAt(time);
  }
  if (txDate === yesterdayYmd) {
    return labels.yesterdayAt(time);
  }

  const parts = txDate.split('-').map((p) => Number(p));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const day = new Date(y, m - 1, d);
  try {
    const datePart = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short'
    }).format(day);
    return time ? `${datePart}, ${time}` : datePart;
  } catch {
    return txDate;
  }
}

export function mapTransactionToRecentRow(
  tx: TransactionOutput,
  categoryName: string | undefined,
  categoryIcon: CategoryIcon | undefined,
  locale: string,
  labels: RecentTimeLabels,
  transferLabel?: string
): RecentTransactionRow {
  const isTransferPair = Boolean(tx.transferGroupId);
  const merchant = isTransferPair
    ? transferLabel ?? tx.description?.trim() || categoryName || ''
    : tx.description?.trim() || categoryName || '';
  const timeLabel = formatRecentTimeLabel(tx.date, tx.createdAt, locale, labels);

  let displayAmountMajor: number;
  let amountVariant: RecentAmountVariant;
  if (isTransferPair) {
    displayAmountMajor = centsToMajor(tx.amount);
    amountVariant = 'neutral';
  } else if (tx.type === 'EXPENSE') {
    displayAmountMajor = -centsToMajor(tx.amount);
    amountVariant = 'expense';
  } else if (tx.type === 'INCOME') {
    displayAmountMajor = centsToMajor(tx.amount);
    amountVariant = 'income';
  } else {
    displayAmountMajor = centsToMajor(tx.amount);
    amountVariant = 'neutral';
  }

  return {
    id: tx.id,
    merchant,
    timeLabel,
    displayAmountMajor,
    amountVariant,
    iconName: isTransferPair ? 'swap-horizontal-outline' : (categoryIcon ?? pickCategoryIcon(categoryName)),
    transferGroupId: tx.transferGroupId
  };
}

export function sortTransactionsByRecency(transactions: TransactionOutput[]): TransactionOutput[] {
  return [...transactions].sort((a, b) => {
    const byDate = compareYmd(b.date, a.date);
    if (byDate !== 0) return byDate;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function dedupeTransferTransactions(transactions: TransactionOutput[]): TransactionOutput[] {
  const seenTransferGroups = new Set<string>();

  return sortTransactionsByRecency(transactions).filter((tx) => {
    if (!tx.transferGroupId) {
      return true;
    }

    if (seenTransferGroups.has(tx.transferGroupId)) {
      return false;
    }

    seenTransferGroups.add(tx.transferGroupId);
    return true;
  });
}

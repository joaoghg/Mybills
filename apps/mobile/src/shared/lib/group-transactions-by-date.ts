import type { TFunction } from 'i18next';

import { ymdFromLocalDate } from '@/shared/lib/billing-cycle';
import { centsToMajor } from '@/shared/utils/cents-to-major';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';

export type HistoryTransactionRow = RecentTransactionRow & {
  dateYmd: string;
  txType: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  amountCents: number;
  subtitle: string;
};

export type TransactionDateSection = {
  dateYmd: string;
  headerLabel: string;
  dailyNetMajor: number;
  rows: HistoryTransactionRow[];
};

const MONTH_KEYS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december'
] as const;

function monthLabel(t: TFunction, monthIndex: number): string {
  const key = MONTH_KEYS[monthIndex];
  return key ? t(`history.months.${key}`) : '';
}

function signedMajor(txType: HistoryTransactionRow['txType'], amountCents: number): number {
  const major = centsToMajor(amountCents);
  if (txType === 'EXPENSE') return -major;
  if (txType === 'INCOME') return major;
  return 0;
}

function formatSectionHeaderLabel(dateYmd: string, t: TFunction): string {
  const parts = dateYmd.split('-').map((part) => Number(part));
  const year = parts[0] ?? 1970;
  const monthIndex = (parts[1] ?? 1) - 1;
  const day = parts[2] ?? 1;

  const todayYmd = ymdFromLocalDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayYmd = ymdFromLocalDate(yesterday);

  const month = monthLabel(t, monthIndex).toUpperCase();

  if (dateYmd === todayYmd) {
    return t('history.todayHeader', { day, month });
  }
  if (dateYmd === yesterdayYmd) {
    return t('history.yesterdayHeader', { day, month });
  }

  return t('history.dateHeader', { day, month, year });
}

export function groupTransactionsByDate(
  rows: HistoryTransactionRow[],
  t: TFunction
): TransactionDateSection[] {
  const byDate = new Map<string, HistoryTransactionRow[]>();

  for (const row of rows) {
    const existing = byDate.get(row.dateYmd) ?? [];
    existing.push(row);
    byDate.set(row.dateYmd, existing);
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([dateYmd, sectionRows]) => {
      const dailyNetMajor = sectionRows.reduce(
        (sum, row) => sum + signedMajor(row.txType, row.amountCents),
        0
      );

      return {
        dateYmd,
        headerLabel: formatSectionHeaderLabel(dateYmd, t),
        dailyNetMajor,
        rows: sectionRows
      };
    });
}

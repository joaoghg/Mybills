import { getMonthlySummary, listCategories } from '@mybills/api-client';
import type { CategoryIcon, TransactionOutput } from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useCallback, useMemo } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import { formatYearMonthLabel, parseYearMonth } from '@/shared/lib/billing-cycle';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import { mapTransactionToRecentRow } from '@/shared/lib/recent-transactions';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';
import { centsToMajor } from '@/shared/utils/cents-to-major';

const STALE_MS = 45_000;

export type SummaryTransactionRow = RecentTransactionRow & {
  subtitle: string;
};

export type SummaryCardInvoiceRow = {
  invoiceId: string;
  cardId: string;
  cardName: string;
  title: string;
  totalMajor: number;
  isFullyPaid: boolean;
  transactions: SummaryTransactionRow[];
};

export type MonthlySummaryViewModel = {
  incomeTotalMajor: number;
  expenseTotalMajor: number;
  netTotalMajor: number;
  income: SummaryTransactionRow[];
  expenses: SummaryTransactionRow[];
  cardInvoices: SummaryCardInvoiceRow[];
  isEmpty: boolean;
};

function transactionDateYmd(tx: TransactionOutput): string {
  return tx.date.split('T')[0] ?? tx.date;
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

function buildSubtitle(
  categoryName: string | undefined,
  createdAt: string,
  locale: string,
  extras: string[] = []
): string {
  const time = formatTimeFromIso(createdAt, locale);
  const category = categoryName?.trim();
  const parts = [...extras];
  if (category) parts.push(category);
  if (time) parts.push(time);
  return parts.join(' • ');
}

function deferredInvoiceMonth(tx: TransactionOutput): string | null {
  if (!tx.cardId || !tx.invoicePaymentMonth) {
    return null;
  }

  const purchaseYearMonth = transactionDateYmd(tx).slice(0, 7);
  return tx.invoicePaymentMonth === purchaseYearMonth ? null : tx.invoicePaymentMonth;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toSummaryRow(
  tx: TransactionOutput,
  categoryName: string | undefined,
  categoryIcon: CategoryIcon | undefined,
  locale: string,
  timeLabels: RecentTimeLabels,
  t: TFunction,
  summaryYearMonth: string
): SummaryTransactionRow {
  const base = mapTransactionToRecentRow(tx, categoryName, categoryIcon, locale, timeLabels);

  const extras: string[] = [];
  if (tx.seriesType === 'INSTALLMENT' && tx.occurrenceNumber && tx.seriesTotalOccurrences) {
    extras.push(
      t('transactions.seriesInstallmentLabel', {
        current: tx.occurrenceNumber,
        total: tx.seriesTotalOccurrences
      })
    );
  } else if (tx.seriesType === 'RECURRING') {
    extras.push(t('transactions.seriesRecurringLabel'));
  }
  if (tx.isProjected) {
    extras.push(t('transactions.projectedLabel'));
  }
  const invoiceMonth = deferredInvoiceMonth(tx);
  if (invoiceMonth) {
    const invoiceYearMonth = parseYearMonth(invoiceMonth);
    extras.push(
      t('transactions.invoicePaymentMonthLabel', {
        month: formatYearMonthLabel(invoiceYearMonth, locale, {
          withYear: invoiceYearMonth.year !== parseYearMonth(transactionDateYmd(tx)).year
        })
      })
    );
  }
  const occurrenceYearMonth = transactionDateYmd(tx).slice(0, 7);
  if (tx.type === 'INCOME' && occurrenceYearMonth !== summaryYearMonth) {
    const occurrence = parseYearMonth(occurrenceYearMonth);
    extras.push(
      t('transactions.receivedInMonthLabel', {
        month: formatYearMonthLabel(occurrence, locale, {
          withYear: occurrence.year !== parseYearMonth(summaryYearMonth).year
        })
      })
    );
  }

  return {
    ...base,
    merchant: base.merchant.trim() ? base.merchant : t('home.noDescription'),
    subtitle: buildSubtitle(categoryName, tx.createdAt, locale, extras)
  };
}

function mapRows(
  txs: TransactionOutput[],
  categoryNameById: Map<string, string>,
  categoryIconById: Map<string, CategoryIcon>,
  locale: string,
  timeLabels: RecentTimeLabels,
  t: TFunction,
  summaryYearMonth: string
): SummaryTransactionRow[] {
  return txs.map((tx) => {
    const categoryName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
    const categoryIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
    return toSummaryRow(tx, categoryName, categoryIcon, locale, timeLabels, t, summaryYearMonth);
  });
}

export function useMonthlySummary(
  month: number,
  year: number,
  locale: string,
  timeLabels: RecentTimeLabels,
  t: TFunction,
  options?: { enabled?: boolean }
): {
  summary: MonthlySummaryViewModel | null;
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
} {
  const client = useHttpClient();
  const enabled = options?.enabled ?? true;

  const summaryQuery = useQuery({
    queryKey: ['transactions', 'summary', year, month],
    queryFn: () => getMonthlySummary(client, { month, year }),
    staleTime: STALE_MS,
    enabled
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(client),
    staleTime: STALE_MS,
    enabled
  });

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categoriesQuery.data]);

  const categoryIconById = useMemo(() => {
    const map = new Map<string, CategoryIcon>();
    for (const category of categoriesQuery.data ?? []) {
      map.set(category.id, category.icon);
    }
    return map;
  }, [categoriesQuery.data]);

  const summary = useMemo((): MonthlySummaryViewModel | null => {
    const data = summaryQuery.data;
    if (!data) return null;

    const summaryYearMonth = `${year}-${pad2(month)}`;
    const income = mapRows(
      data.income,
      categoryNameById,
      categoryIconById,
      locale,
      timeLabels,
      t,
      summaryYearMonth
    );
    const expenses = mapRows(
      data.expenses,
      categoryNameById,
      categoryIconById,
      locale,
      timeLabels,
      t,
      summaryYearMonth
    );
    const cardInvoices: SummaryCardInvoiceRow[] = data.cardInvoices.map((invoice) => ({
      invoiceId: invoice.invoiceId,
      cardId: invoice.cardId,
      cardName: invoice.cardName,
      title: t('history.summaryCardInvoice', { cardName: invoice.cardName }),
      totalMajor: centsToMajor(invoice.total),
      isFullyPaid: invoice.isFullyPaid,
      transactions: mapRows(
        invoice.transactions,
        categoryNameById,
        categoryIconById,
        locale,
        timeLabels,
        t,
        summaryYearMonth
      )
    }));

    return {
      incomeTotalMajor: centsToMajor(data.incomeTotal),
      expenseTotalMajor: centsToMajor(data.expenseTotal),
      netTotalMajor: centsToMajor(data.netTotal),
      income,
      expenses,
      cardInvoices,
      isEmpty:
        income.length === 0 && expenses.length === 0 && cardInvoices.length === 0
    };
  }, [
    summaryQuery.data,
    categoryNameById,
    categoryIconById,
    locale,
    timeLabels,
    t,
    month,
    year
  ]);

  const isLoading =
    enabled && (summaryQuery.isPending || categoriesQuery.isPending);
  const isError = enabled && (summaryQuery.isError || categoriesQuery.isError);
  const isRefetching =
    enabled && (summaryQuery.isRefetching || categoriesQuery.isRefetching);

  const refetch = useCallback(async () => {
    await Promise.all([summaryQuery.refetch(), categoriesQuery.refetch()]);
  }, [summaryQuery, categoriesQuery]);

  return {
    summary,
    isLoading,
    isError,
    isRefetching,
    refetch
  };
}

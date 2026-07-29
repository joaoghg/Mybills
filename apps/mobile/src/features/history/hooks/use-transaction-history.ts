import {
  listAccounts,
  listCategories,
  listCreditCards,
  listTransactions
} from '@mybills/api-client';
import type {
  AccountOutput,
  CategoryIcon,
  CategoryOutput,
  CreditCardOutput,
  ListTransactionsQueryInput,
  TransactionOutput
} from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import { formatYearMonthLabel, parseYearMonth } from '@/shared/lib/billing-cycle';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import {
  dedupeTransferTransactions,
  mapTransactionToRecentRow
} from '@/shared/lib/recent-transactions';
import {
  groupTransactionsByDate,
  type HistoryTransactionRow,
  type TransactionDateSection
} from '@/shared/lib/group-transactions-by-date';

const STALE_MS = 45_000;

export type HistoryTypeFilter = 'INCOME' | 'EXPENSE' | null;

export type HistoryFilters = {
  selectedMonth: number;
  selectedYear: number;
  search: string;
  categoryId: string | null;
  accountId: string | null;
  cardId: string | null;
  type: HistoryTypeFilter;
  includeTransfer: boolean;
};

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfCalendarMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function selectedYearMonth(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

function transactionDateYmd(tx: TransactionOutput): string {
  return tx.date.split('T')[0] ?? tx.date;
}

function belongsToHistoryMonth(
  tx: TransactionOutput,
  selectedYear: number,
  selectedMonth: number
): boolean {
  return transactionDateYmd(tx).startsWith(selectedYearMonth(selectedYear, selectedMonth));
}

/**
 * Invoice month worth showing: only when the card invoice is paid in a month
 * other than the one the purchase is listed under.
 */
function deferredInvoiceMonth(tx: TransactionOutput): string | null {
  if (!tx.cardId || !tx.invoicePaymentMonth) {
    return null;
  }

  const purchaseYearMonth = transactionDateYmd(tx).slice(0, 7);
  return tx.invoicePaymentMonth === purchaseYearMonth ? null : tx.invoicePaymentMonth;
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

function toHistoryRow(
  tx: TransactionOutput,
  categoryName: string | undefined,
  categoryIcon: CategoryIcon | undefined,
  locale: string,
  timeLabels: RecentTimeLabels,
  transferLabel: string,
  t: TFunction
): HistoryTransactionRow {
  const base = mapTransactionToRecentRow(
    tx,
    categoryName,
    categoryIcon,
    locale,
    timeLabels,
    transferLabel
  );

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

  return {
    ...base,
    dateYmd: transactionDateYmd(tx),
    txType: tx.transferGroupId ? 'TRANSFER' : tx.type,
    amountCents: tx.amount,
    subtitle: tx.transferGroupId
      ? transferLabel
      : buildSubtitle(categoryName, tx.createdAt, locale, extras)
  };
}

function buildApiQuery(filters: HistoryFilters, debouncedSearch: string): ListTransactionsQueryInput {
  const from = `${filters.selectedYear}-${pad2(filters.selectedMonth)}-01`;
  const toDay = lastDayOfCalendarMonth(filters.selectedYear, filters.selectedMonth);
  const to = `${filters.selectedYear}-${pad2(filters.selectedMonth)}-${pad2(toDay)}`;

  return {
    from,
    to,
    includeTransfer: filters.includeTransfer,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.accountId ? { accountId: filters.accountId } : {}),
    ...(filters.cardId ? { cardId: filters.cardId } : {}),
    ...(filters.type ? { type: filters.type } : {})
  };
}

function hasActiveAdvancedFilters(filters: HistoryFilters, debouncedSearch: string): boolean {
  return (
    debouncedSearch.length > 0 ||
    filters.categoryId !== null ||
    filters.accountId !== null ||
    filters.cardId !== null ||
    filters.type !== null ||
    filters.includeTransfer
  );
}

export function useTransactionHistory(
  locale: string,
  timeLabels: RecentTimeLabels,
  t: TFunction,
  options?: { enabled?: boolean }
): {
  filters: HistoryFilters;
  categories: CategoryOutput[];
  accounts: AccountOutput[];
  creditCards: CreditCardOutput[];
  sections: TransactionDateSection[];
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  hasActiveAdvancedFilters: boolean;
  refetch: () => Promise<void>;
  setSearch: (value: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  setAccountId: (accountId: string | null) => void;
  setCardId: (cardId: string | null) => void;
  setType: (type: HistoryTypeFilter) => void;
  setIncludeTransfer: (value: boolean) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  selectMonthYear: (month: number, year: number) => void;
  clearAdvancedFilters: () => void;
  monthTitle: string;
} {
  const client = useHttpClient();
  const listEnabled = options?.enabled ?? true;
  const initial = currentMonthYear();

  const [filters, setFilters] = useState<HistoryFilters>({
    selectedMonth: initial.month,
    selectedYear: initial.year,
    search: '',
    categoryId: null,
    accountId: null,
    cardId: null,
    type: null,
    includeTransfer: false
  });

  const debouncedSearch = useDeferredValue(filters.search.trim());
  const apiQuery = useMemo(
    () => buildApiQuery(filters, debouncedSearch),
    [filters, debouncedSearch]
  );

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'history', apiQuery],
    queryFn: () => listTransactions(client, apiQuery),
    staleTime: STALE_MS,
    enabled: listEnabled
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(client),
    staleTime: STALE_MS
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(client),
    staleTime: STALE_MS
  });

  const creditCardsQuery = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => listCreditCards(client),
    staleTime: STALE_MS
  });

  const isLoading =
    listEnabled &&
    (transactionsQuery.isPending ||
      categoriesQuery.isPending ||
      accountsQuery.isPending ||
      creditCardsQuery.isPending);
  const isError =
    listEnabled &&
    (transactionsQuery.isError ||
      categoriesQuery.isError ||
      accountsQuery.isError ||
      creditCardsQuery.isError);
  const isRefetching =
    listEnabled &&
    (transactionsQuery.isRefetching ||
      categoriesQuery.isRefetching ||
      accountsQuery.isRefetching ||
      creditCardsQuery.isRefetching);

  const refetch = useCallback(async () => {
    await categoriesQuery.refetch();
    await accountsQuery.refetch();
    await creditCardsQuery.refetch();
    if (listEnabled) {
      await transactionsQuery.refetch();
    }
  }, [listEnabled, transactionsQuery, categoriesQuery, accountsQuery, creditCardsQuery]);

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

  const rows = useMemo((): HistoryTransactionRow[] => {
    const txs = transactionsQuery.data ?? [];
    const transferLabel = t('transactions.types.transfer');
    const displayTransactions = dedupeTransferTransactions(txs).filter((tx) =>
      belongsToHistoryMonth(tx, filters.selectedYear, filters.selectedMonth)
    );

    return displayTransactions.map((tx) => {
      const categoryName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const categoryIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
      return toHistoryRow(tx, categoryName, categoryIcon, locale, timeLabels, transferLabel, t);
    });
  }, [
    transactionsQuery.data,
    categoryNameById,
    categoryIconById,
    locale,
    timeLabels,
    t,
    filters.selectedYear,
    filters.selectedMonth
  ]);

  const sections = useMemo(() => groupTransactionsByDate(rows, t), [rows, t]);

  const monthTitle = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric'
      }).format(new Date(filters.selectedYear, filters.selectedMonth - 1, 1));
    } catch {
      return `${filters.selectedMonth}/${filters.selectedYear}`;
    }
  }, [filters.selectedMonth, filters.selectedYear, locale]);

  const setSearch = useCallback((value: string) => {
    setFilters((current) => ({ ...current, search: value }));
  }, []);

  const setCategoryId = useCallback((categoryId: string | null) => {
    setFilters((current) => ({ ...current, categoryId }));
  }, []);

  const setAccountId = useCallback((accountId: string | null) => {
    setFilters((current) => ({ ...current, accountId }));
  }, []);

  const setCardId = useCallback((cardId: string | null) => {
    setFilters((current) => ({ ...current, cardId }));
  }, []);

  const setType = useCallback((type: HistoryTypeFilter) => {
    setFilters((current) => ({ ...current, type }));
  }, []);

  const setIncludeTransfer = useCallback((value: boolean) => {
    setFilters((current) => ({ ...current, includeTransfer: value }));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setFilters((current) => {
      const date = new Date(current.selectedYear, current.selectedMonth - 2, 1);
      return {
        ...current,
        selectedMonth: date.getMonth() + 1,
        selectedYear: date.getFullYear()
      };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setFilters((current) => {
      const date = new Date(current.selectedYear, current.selectedMonth, 1);
      return {
        ...current,
        selectedMonth: date.getMonth() + 1,
        selectedYear: date.getFullYear()
      };
    });
  }, []);

  const selectMonthYear = useCallback((month: number, year: number) => {
    setFilters((current) => ({ ...current, selectedMonth: month, selectedYear: year }));
  }, []);

  const clearAdvancedFilters = useCallback(() => {
    setFilters((current) => ({
      ...current,
      search: '',
      categoryId: null,
      accountId: null,
      cardId: null,
      type: null,
      includeTransfer: false
    }));
  }, []);

  return {
    filters,
    categories: categoriesQuery.data ?? [],
    accounts: accountsQuery.data ?? [],
    creditCards: creditCardsQuery.data ?? [],
    sections,
    isLoading,
    isError,
    isRefetching,
    hasActiveAdvancedFilters: hasActiveAdvancedFilters(filters, debouncedSearch),
    refetch,
    setSearch,
    setCategoryId,
    setAccountId,
    setCardId,
    setType,
    setIncludeTransfer,
    goToPreviousMonth,
    goToNextMonth,
    selectMonthYear,
    clearAdvancedFilters,
    monthTitle
  };
}

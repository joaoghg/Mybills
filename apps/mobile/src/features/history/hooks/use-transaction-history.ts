import { listCategories, listTransactions } from '@mybills/api-client';
import type {
  CategoryIcon,
  CategoryOutput,
  ListTransactionsQueryInput,
  TransactionOutput
} from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import {
  groupTransactionsByDate,
  type HistoryTransactionRow,
  type TransactionDateSection
} from '@/features/history/lib/group-transactions-by-date';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import {
  mapTransactionToRecentRow,
  sortTransactionsByRecency
} from '@/shared/lib/recent-transactions';

const STALE_MS = 45_000;

export type HistoryTypeFilter = 'INCOME' | 'EXPENSE' | null;

export type HistoryFilters = {
  selectedMonth: number;
  selectedYear: number;
  search: string;
  categoryId: string | null;
  type: HistoryTypeFilter;
  includeTransfer: boolean;
};

function currentMonthYear(): { month: number; year: number } {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
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
  locale: string
): string {
  const time = formatTimeFromIso(createdAt, locale);
  const category = categoryName?.trim();
  if (category && time) return `${category} • ${time}`;
  if (category) return category;
  return time;
}

function toHistoryRow(
  tx: TransactionOutput,
  categoryName: string | undefined,
  categoryIcon: CategoryIcon | undefined,
  locale: string,
  timeLabels: RecentTimeLabels
): HistoryTransactionRow {
  const base = mapTransactionToRecentRow(tx, categoryName, categoryIcon, locale, timeLabels);

  return {
    ...base,
    dateYmd: tx.date,
    txType: tx.type,
    amountCents: tx.amount,
    subtitle: buildSubtitle(categoryName, tx.createdAt, locale)
  };
}

function buildApiQuery(filters: HistoryFilters, debouncedSearch: string): ListTransactionsQueryInput {
  return {
    year: filters.selectedYear,
    month: filters.selectedMonth,
    includeTransfer: filters.includeTransfer,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.type ? { type: filters.type } : {})
  };
}

function hasActiveAdvancedFilters(filters: HistoryFilters, debouncedSearch: string): boolean {
  return (
    debouncedSearch.length > 0 ||
    filters.categoryId !== null ||
    filters.type !== null ||
    filters.includeTransfer
  );
}

export function useTransactionHistory(
  locale: string,
  timeLabels: RecentTimeLabels,
  t: TFunction
): {
  filters: HistoryFilters;
  categories: CategoryOutput[];
  sections: TransactionDateSection[];
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  hasActiveAdvancedFilters: boolean;
  refetch: () => Promise<void>;
  setSearch: (value: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  setType: (type: HistoryTypeFilter) => void;
  setIncludeTransfer: (value: boolean) => void;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  selectMonthYear: (month: number, year: number) => void;
  clearAdvancedFilters: () => void;
  recentMonthPills: Array<{ month: number; year: number; label: string }>;
  monthTitle: string;
} {
  const client = useHttpClient();
  const initial = currentMonthYear();

  const [filters, setFilters] = useState<HistoryFilters>({
    selectedMonth: initial.month,
    selectedYear: initial.year,
    search: '',
    categoryId: null,
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
    staleTime: STALE_MS
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(client),
    staleTime: STALE_MS
  });

  const isLoading = transactionsQuery.isPending || categoriesQuery.isPending;
  const isError = transactionsQuery.isError || categoriesQuery.isError;
  const isRefetching = transactionsQuery.isRefetching || categoriesQuery.isRefetching;

  const refetch = useCallback(async () => {
    await Promise.all([transactionsQuery.refetch(), categoriesQuery.refetch()]);
  }, [transactionsQuery, categoriesQuery]);

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
    const sorted = sortTransactionsByRecency(txs);
    return sorted.map((tx) => {
      const categoryName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const categoryIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
      return toHistoryRow(tx, categoryName, categoryIcon, locale, timeLabels);
    });
  }, [transactionsQuery.data, categoryNameById, categoryIconById, locale, timeLabels]);

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

  const recentMonthPills = useMemo(() => {
    const pills: Array<{ month: number; year: number; label: string }> = [];
    const anchor = new Date(filters.selectedYear, filters.selectedMonth - 1, 1);

    for (let offset = 4; offset >= 0; offset -= 1) {
      const date = new Date(anchor.getFullYear(), anchor.getMonth() - offset, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      let label = String(month);
      try {
        label = new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
      } catch {
        // keep numeric fallback
      }
      pills.push({ month, year, label });
    }

    return pills;
  }, [filters.selectedMonth, filters.selectedYear, locale]);

  const setSearch = useCallback((value: string) => {
    setFilters((current) => ({ ...current, search: value }));
  }, []);

  const setCategoryId = useCallback((categoryId: string | null) => {
    setFilters((current) => ({ ...current, categoryId }));
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
      type: null,
      includeTransfer: false
    }));
  }, []);

  return {
    filters,
    categories: categoriesQuery.data ?? [],
    sections,
    isLoading,
    isError,
    isRefetching,
    hasActiveAdvancedFilters: hasActiveAdvancedFilters(filters, debouncedSearch),
    refetch,
    setSearch,
    setCategoryId,
    setType,
    setIncludeTransfer,
    goToPreviousMonth,
    goToNextMonth,
    selectMonthYear,
    clearAdvancedFilters,
    recentMonthPills,
    monthTitle
  };
}

import { listCategories, listTransactions } from '@mybills/api-client';
import type { CategoryIcon, TransactionOutput } from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import {
  mapTransactionToRecentRow,
  sortTransactionsByRecency
} from '@/shared/lib/recent-transactions';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';

const STALE_MS = 45_000;

export function useTransactionRows(
  locale: string,
  timeLabels: RecentTimeLabels
): {
  isLoading: boolean;
  isError: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
  rows: RecentTransactionRow[];
} {
  const client = useHttpClient();

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    queryFn: () => listTransactions(client),
    staleTime: STALE_MS
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(client),
    staleTime: STALE_MS
  });

  const isLoading = transactionsQuery.isPending || categoriesQuery.isPending;
  const isError = transactionsQuery.isError || categoriesQuery.isError;
  const isRefetching =
    transactionsQuery.isRefetching || categoriesQuery.isRefetching;

  const refetch = useCallback(async () => {
    await Promise.all([transactionsQuery.refetch(), categoriesQuery.refetch()]);
  }, [transactionsQuery, categoriesQuery]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categoriesQuery.data ?? []) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categoriesQuery.data]);

  const categoryIconById = useMemo(() => {
    const map = new Map<string, CategoryIcon>();
    for (const c of categoriesQuery.data ?? []) {
      map.set(c.id, c.icon);
    }
    return map;
  }, [categoriesQuery.data]);

  const rows = useMemo((): RecentTransactionRow[] => {
    const txs = transactionsQuery.data ?? [];
    const sorted = sortTransactionsByRecency(txs);
    return sorted.map((tx: TransactionOutput) => {
      const catName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const catIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
      return mapTransactionToRecentRow(tx, catName, catIcon, locale, timeLabels);
    });
  }, [transactionsQuery.data, categoryNameById, categoryIconById, locale, timeLabels]);

  return {
    isLoading,
    isError,
    isRefetching,
    refetch,
    rows
  };
}

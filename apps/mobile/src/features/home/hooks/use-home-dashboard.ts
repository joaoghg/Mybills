import {
  listAccounts,
  listCategories,
  listCreditCards,
  listTransactions
} from '@mybills/api-client';
import type { CategoryIcon, CreditCardOutput, TransactionOutput } from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import {
  mapTransactionToRecentRow,
  sortTransactionsByRecency
} from '@/shared/lib/recent-transactions';
import {
  daysUntilNextDueDay,
  formatDueDate,
  getCurrentBillingCycleRange,
  ymdFromLocalDate
} from '@/shared/lib/billing-cycle';
import {
  sumUnpaidCardExpensesAllTime,
  sumUnpaidCardExpensesInRange
} from '@/shared/lib/card-expenses';
import type { RecentTransactionRow } from '@/shared/types/recent-transaction';
import { centsToMajor } from '@/shared/utils/cents-to-major';

const STALE_MS = 45_000;
const RECENT_LIMIT = 3;

export type HomeCreditCardSummary = {
  cardId: string;
  cardName: string;
  dueDateLabel: string;
  invoiceTotalMajor: number;
  limitMajor: number;
  usedMajor: number;
  availableMajor: number;
  usageRatio: number;
  isOpen: boolean;
};

function pickNearestDueCard(cards: CreditCardOutput[], today: Date): CreditCardOutput | null {
  if (cards.length === 0) return null;
  return cards.reduce((best, card) => {
    const bestDays = daysUntilNextDueDay(best.dueDay, today);
    const cardDays = daysUntilNextDueDay(card.dueDay, today);
    return cardDays < bestDays ? card : best;
  });
}

export function useHomeDashboard(
  locale: string,
  timeLabels: RecentTimeLabels
): {
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => Promise<void>;
  totalBalanceMajor: number;
  creditCard: HomeCreditCardSummary | null;
  recent: RecentTransactionRow[];
} {
  const client = useHttpClient();

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

  const isLoading =
    accountsQuery.isPending ||
    creditCardsQuery.isPending ||
    transactionsQuery.isPending ||
    categoriesQuery.isPending;

  const isError =
    accountsQuery.isError ||
    creditCardsQuery.isError ||
    transactionsQuery.isError ||
    categoriesQuery.isError;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      accountsQuery.refetch(),
      creditCardsQuery.refetch(),
      transactionsQuery.refetch(),
      categoriesQuery.refetch()
    ]);
  }, [accountsQuery, creditCardsQuery, transactionsQuery, categoriesQuery]);

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

  const totalBalanceMajor = useMemo(() => {
    const list = accountsQuery.data ?? [];
    const totalCents = list.reduce((sum, account) => sum + account.balance, 0);
    return centsToMajor(totalCents);
  }, [accountsQuery.data]);

  const creditCard = useMemo((): HomeCreditCardSummary | null => {
    const cards = creditCardsQuery.data ?? [];
    const txs = transactionsQuery.data ?? [];
    const today = new Date();
    const primary = pickNearestDueCard(cards, today);
    if (!primary) return null;

    const { start, end } = getCurrentBillingCycleRange(primary.closingDay, today);
    const todayYmd = ymdFromLocalDate(today);
    const invoiceCents = sumUnpaidCardExpensesInRange(txs, primary.id, start, end, todayYmd);
    const usedCents = sumUnpaidCardExpensesAllTime(txs, primary.id);
    const limitMajor = centsToMajor(primary.limit);
    const usedMajor = centsToMajor(usedCents);
    const availableMajor = Math.max(0, centsToMajor(primary.limit - usedCents));
    const usageRatio = primary.limit > 0 ? Math.min(1, usedCents / primary.limit) : 0;

    return {
      cardId: primary.id,
      cardName: primary.name,
      dueDateLabel: formatDueDate(primary.dueDay, today, locale),
      invoiceTotalMajor: centsToMajor(invoiceCents),
      limitMajor,
      usedMajor,
      availableMajor,
      usageRatio,
      isOpen: invoiceCents > 0
    };
  }, [creditCardsQuery.data, transactionsQuery.data, locale]);

  const recent = useMemo((): RecentTransactionRow[] => {
    const txs = transactionsQuery.data ?? [];
    const sorted = sortTransactionsByRecency(txs);
    return sorted.slice(0, RECENT_LIMIT).map((tx: TransactionOutput) => {
      const catName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const catIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
      return mapTransactionToRecentRow(tx, catName, catIcon, locale, timeLabels);
    });
  }, [transactionsQuery.data, categoryNameById, categoryIconById, locale, timeLabels]);

  return {
    isLoading,
    isError,
    refetchAll,
    totalBalanceMajor,
    creditCard,
    recent
  };
}

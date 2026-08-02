import {
  listAccounts,
  listCategories,
  listCreditCards,
  listTransactions
} from '@mybills/api-client';
import type { CategoryIcon, CreditCardOutput, TransactionOutput } from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import {
  dedupeTransferTransactions,
  mapTransactionToRecentRow
} from '@/shared/lib/recent-transactions';
import {
  daysUntilNextDueDay,
  formatDueDate,
  getOpenBillingCycleRange,
  resolveClosingDay,
  ymdFromLocalDate
} from '@/shared/lib/billing-cycle';
import { sumUnpaidCardExpensesInRange } from '@/shared/lib/card-expenses';
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
  timeLabels: RecentTimeLabels,
  transferLabel: string
): {
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => Promise<void>;
  totalBalanceMajor: number;
  creditCard: HomeCreditCardSummary | null;
  canCycleCards: boolean;
  selectNextCard: () => void;
  recent: RecentTransactionRow[];
} {
  const client = useHttpClient();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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

  const cards = creditCardsQuery.data ?? [];

  useEffect(() => {
    const list = creditCardsQuery.data ?? [];
    if (list.length === 0) {
      setSelectedCardId(null);
      return;
    }
    const exists = selectedCardId !== null && list.some((c) => c.id === selectedCardId);
    if (exists) return;
    const nearest = pickNearestDueCard(list, new Date());
    setSelectedCardId(nearest?.id ?? list[0]?.id ?? null);
  }, [creditCardsQuery.data, selectedCardId]);

  const selectedCard = useMemo((): CreditCardOutput | null => {
    if (!selectedCardId) return null;
    return cards.find((c) => c.id === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

  const openCycle = useMemo(() => {
    if (!selectedCard) return null;
    return getOpenBillingCycleRange(resolveClosingDay(selectedCard), new Date());
  }, [selectedCard]);

  const invoiceQuery = useQuery({
    queryKey: [
      'transactions',
      'invoice',
      selectedCardId,
      openCycle?.start ?? null,
      openCycle?.end ?? null
    ],
    queryFn: () =>
      listTransactions(client, {
        cardId: selectedCardId!,
        from: openCycle!.start,
        to: openCycle!.end,
        isProjected: false
      }),
    enabled: selectedCardId !== null && openCycle !== null,
    staleTime: STALE_MS
  });

  const recentTransactionsQuery = useQuery({
    queryKey: ['transactions', 'recent', RECENT_LIMIT],
    queryFn: () => listTransactions(client, { limit: RECENT_LIMIT, isProjected: false }),
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
    (selectedCardId !== null && invoiceQuery.isPending) ||
    recentTransactionsQuery.isPending ||
    categoriesQuery.isPending;

  const isError =
    accountsQuery.isError ||
    creditCardsQuery.isError ||
    invoiceQuery.isError ||
    recentTransactionsQuery.isError ||
    categoriesQuery.isError;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      accountsQuery.refetch(),
      creditCardsQuery.refetch(),
      invoiceQuery.refetch(),
      recentTransactionsQuery.refetch(),
      categoriesQuery.refetch()
    ]);
  }, [
    accountsQuery,
    creditCardsQuery,
    invoiceQuery,
    recentTransactionsQuery,
    categoriesQuery
  ]);

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

  const canCycleCards = cards.length > 1;

  const selectNextCard = useCallback(() => {
    if (cards.length <= 1 || selectedCardId === null) return;
    const index = cards.findIndex((c) => c.id === selectedCardId);
    if (index < 0) return;
    const next = cards[(index + 1) % cards.length];
    if (next) setSelectedCardId(next.id);
  }, [cards, selectedCardId]);

  const creditCard = useMemo((): HomeCreditCardSummary | null => {
    if (!selectedCard || !openCycle) return null;

    const today = new Date();
    const todayYmd = ymdFromLocalDate(today);
    const invoiceTxs = invoiceQuery.data ?? [];
    const invoiceCents = sumUnpaidCardExpensesInRange(
      invoiceTxs,
      selectedCard.id,
      openCycle.start,
      openCycle.end,
      todayYmd
    );
    const usedCents = selectedCard.usedAmount;
    const limitMajor = centsToMajor(selectedCard.limit);
    const usedMajor = centsToMajor(usedCents);
    const availableMajor = Math.max(0, centsToMajor(selectedCard.limit - usedCents));
    const usageRatio = selectedCard.limit > 0 ? Math.min(1, usedCents / selectedCard.limit) : 0;

    return {
      cardId: selectedCard.id,
      cardName: selectedCard.name,
      dueDateLabel: formatDueDate(selectedCard.dueDay, today, locale),
      invoiceTotalMajor: centsToMajor(invoiceCents),
      limitMajor,
      usedMajor,
      availableMajor,
      usageRatio,
      isOpen: invoiceCents > 0
    };
  }, [selectedCard, openCycle, invoiceQuery.data, locale]);

  const recent = useMemo((): RecentTransactionRow[] => {
    const txs = recentTransactionsQuery.data ?? [];
    const displayTransactions = dedupeTransferTransactions(txs).slice(0, RECENT_LIMIT);

    return displayTransactions.map((tx: TransactionOutput) => {
      const catName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const catIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
      return mapTransactionToRecentRow(tx, catName, catIcon, locale, timeLabels, transferLabel);
    });
  }, [
    recentTransactionsQuery.data,
    categoryNameById,
    categoryIconById,
    locale,
    timeLabels,
    transferLabel
  ]);

  return {
    isLoading,
    isError,
    refetchAll,
    totalBalanceMajor,
    creditCard,
    canCycleCards,
    selectNextCard,
    recent
  };
}

import {
  listAccounts,
  listCategories,
  listCreditCards,
  listTransactions
} from '@mybills/api-client';
import type { CreditCardOutput, TransactionOutput } from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import {
  daysUntilNextDueDay,
  getCurrentBillingCycleRange,
  ymdFromLocalDate
} from '@/features/home/lib/billing-cycle';
import { centsToMajor } from '@/shared/utils/cents-to-major';

const STALE_MS = 45_000;
const RECENT_LIMIT = 8;

export type HomeAccountRow = {
  id: string;
  title: string;
  subtitle: string;
  balanceMajor: number;
};

export type HomePhysicalCard = {
  id: string;
  name: string;
  availableLimitMajor: number;
  variant: 'navy' | 'green';
};

export type HomeInvoice = {
  totalMajor: number;
  dueInDays: number;
  cardName: string;
};

export type HomeRecentAmountVariant = 'expense' | 'income' | 'neutral';

export type HomeRecentTransaction = {
  id: string;
  merchant: string;
  timeLabel: string;
  displayAmountMajor: number;
  amountVariant: HomeRecentAmountVariant;
  iconName: 'cart-outline' | 'restaurant-outline' | 'receipt-outline';
};

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function sumUnpaidCardExpensesInRange(
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

function sumUnpaidCardExpensesAllTime(transactions: TransactionOutput[], cardId: string): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.cardId !== cardId) continue;
    if (tx.type !== 'EXPENSE') continue;
    if (tx.isPaid) continue;
    sum += tx.amount;
  }
  return sum;
}

function pickCategoryIcon(categoryName: string | undefined): HomeRecentTransaction['iconName'] {
  const n = (categoryName ?? '').toLowerCase();
  if (/(food|restaurant|lunch|almoço|jantar|pizza)/i.test(n)) return 'restaurant-outline';
  if (/(market|grocery|super|mercado)/i.test(n)) return 'cart-outline';
  return 'receipt-outline';
}

function formatRecentTimeLabel(dateStr: string, locale: string): string {
  const parts = dateStr.split('-').map((p) => Number(p));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const day = new Date(y, m - 1, d);
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short'
    }).format(day);
  } catch {
    return dateStr;
  }
}

export function useHomeDashboard(locale: string): {
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => Promise<void>;
  account: HomeAccountRow | null;
  physicalCards: HomePhysicalCard[];
  selectedCardId: string | null;
  setSelectedCardId: (id: string) => void;
  invoice: HomeInvoice | null;
  recent: HomeRecentTransaction[];
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
    const list = categoriesQuery.data ?? [];
    for (const c of list) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categoriesQuery.data]);

  const account = useMemo((): HomeAccountRow | null => {
    const list = accountsQuery.data ?? [];
    if (list.length === 0) return null;
    const sorted = [...list].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const a = sorted[0];
    if (!a) return null;
    return {
      id: a.id,
      title: a.name,
      subtitle: '',
      balanceMajor: centsToMajor(a.balance)
    };
  }, [accountsQuery.data]);

  const physicalCards = useMemo((): HomePhysicalCard[] => {
    const cards = creditCardsQuery.data ?? [];
    const txs = transactionsQuery.data ?? [];
    return cards.map((c, index) => {
      const usedCents = sumUnpaidCardExpensesAllTime(txs, c.id);
      const available = Math.max(0, c.limit - usedCents);
      return {
        id: c.id,
        name: c.name,
        availableLimitMajor: centsToMajor(available),
        variant: index % 2 === 0 ? 'navy' : 'green'
      };
    });
  }, [creditCardsQuery.data, transactionsQuery.data]);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  useEffect(() => {
    if (physicalCards.length === 0) {
      return;
    }
    const exists = selectedCardId && physicalCards.some((c) => c.id === selectedCardId);
    if (!exists) {
      const first = physicalCards[0];
      if (first) setSelectedCardId(first.id);
    }
  }, [physicalCards, selectedCardId]);

  const invoice = useMemo((): HomeInvoice | null => {
    const cards = creditCardsQuery.data ?? [];
    const txs = transactionsQuery.data ?? [];
    if (!selectedCardId || cards.length === 0) return null;
    const card: CreditCardOutput | undefined = cards.find((c) => c.id === selectedCardId);
    if (!card) return null;
    const today = new Date();
    const { start, end } = getCurrentBillingCycleRange(card.closingDay, today);
    const todayYmd = ymdFromLocalDate(today);
    const totalCents = sumUnpaidCardExpensesInRange(txs, card.id, start, end, todayYmd);
    return {
      totalMajor: centsToMajor(totalCents),
      dueInDays: daysUntilNextDueDay(card.dueDay, today),
      cardName: card.name
    };
  }, [creditCardsQuery.data, transactionsQuery.data, selectedCardId]);

  const recent = useMemo((): HomeRecentTransaction[] => {
    const txs = transactionsQuery.data ?? [];
    const sorted = [...txs].sort((a, b) => {
      const byDate = compareYmd(b.date, a.date);
      if (byDate !== 0) return byDate;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const slice = sorted.slice(0, RECENT_LIMIT);
    return slice.map((tx) => {
      const catName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const merchant =
        tx.description?.trim() ||
        catName ||
        '';
      const timeLabel = formatRecentTimeLabel(tx.date, locale);
      let displayAmountMajor: number;
      let amountVariant: HomeRecentAmountVariant;
      if (tx.type === 'EXPENSE') {
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
        iconName: pickCategoryIcon(catName)
      };
    });
  }, [transactionsQuery.data, categoryNameById, locale]);

  return {
    isLoading,
    isError,
    refetchAll,
    account,
    physicalCards,
    selectedCardId,
    setSelectedCardId,
    invoice,
    recent
  };
}

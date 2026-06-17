import {
  listAccounts,
  listCreditCards,
  listTransactions
} from '@mybills/api-client';
import type { CreditCardOutput } from '@mybills/dtos';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import {
  daysUntilNextDueDay,
  getCurrentBillingCycleRange,
  ymdFromLocalDate
} from '@/shared/lib/billing-cycle';
import {
  sumUnpaidCardExpensesAllTime,
  sumUnpaidCardExpensesInRange
} from '@/shared/lib/card-expenses';
import { centsToMajor } from '@/shared/utils/cents-to-major';

const STALE_MS = 45_000;

export type WalletAccountRow = {
  id: string;
  title: string;
  subtitle: string;
  balanceMajor: number;
};

export type WalletPhysicalCard = {
  id: string;
  name: string;
  availableLimitMajor: number;
  variant: 'navy' | 'green';
};

export type WalletInvoice = {
  totalMajor: number;
  dueInDays: number;
  cardName: string;
};

export function useWalletDashboard(): {
  isLoading: boolean;
  isError: boolean;
  refetchAll: () => Promise<void>;
  accounts: WalletAccountRow[];
  physicalCards: WalletPhysicalCard[];
  selectedCardId: string | null;
  setSelectedCardId: (id: string) => void;
  invoice: WalletInvoice | null;
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

  const isLoading =
    accountsQuery.isPending || creditCardsQuery.isPending || transactionsQuery.isPending;

  const isError =
    accountsQuery.isError || creditCardsQuery.isError || transactionsQuery.isError;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      accountsQuery.refetch(),
      creditCardsQuery.refetch(),
      transactionsQuery.refetch()
    ]);
  }, [accountsQuery, creditCardsQuery, transactionsQuery]);

  const accounts = useMemo((): WalletAccountRow[] => {
    const list = accountsQuery.data ?? [];
    return [...list]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: '',
        balanceMajor: centsToMajor(a.balance)
      }));
  }, [accountsQuery.data]);

  const physicalCards = useMemo((): WalletPhysicalCard[] => {
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

  const invoice = useMemo((): WalletInvoice | null => {
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

  return {
    isLoading,
    isError,
    refetchAll,
    accounts,
    physicalCards,
    selectedCardId,
    setSelectedCardId,
    invoice
  };
}

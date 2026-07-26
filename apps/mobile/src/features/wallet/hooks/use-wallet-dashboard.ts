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
  getOpenBillingCycleRange,
  ymdFromLocalDate
} from '@/shared/lib/billing-cycle';
import { sumUnpaidCardExpensesInRange } from '@/shared/lib/card-expenses';
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

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const selectedCard = useMemo((): CreditCardOutput | null => {
    if (!selectedCardId) return null;
    return (creditCardsQuery.data ?? []).find((c) => c.id === selectedCardId) ?? null;
  }, [creditCardsQuery.data, selectedCardId]);

  const openCycle = useMemo(() => {
    if (!selectedCard) return null;
    return getOpenBillingCycleRange(selectedCard.closingDay, new Date());
  }, [selectedCard]);

  const invoiceTransactionsQuery = useQuery({
    queryKey: [
      'transactions',
      'wallet-invoice',
      selectedCardId,
      openCycle?.start,
      openCycle?.end
    ],
    queryFn: () =>
      listTransactions(client, {
        cardId: selectedCardId!,
        from: openCycle!.start,
        to: openCycle!.end,
        type: 'EXPENSE'
      }),
    staleTime: STALE_MS,
    enabled: Boolean(selectedCardId && openCycle)
  });

  const isLoading =
    accountsQuery.isPending ||
    creditCardsQuery.isPending ||
    (Boolean(selectedCardId && openCycle) && invoiceTransactionsQuery.isPending);

  const isError =
    accountsQuery.isError ||
    creditCardsQuery.isError ||
    invoiceTransactionsQuery.isError;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      accountsQuery.refetch(),
      creditCardsQuery.refetch(),
      invoiceTransactionsQuery.refetch()
    ]);
  }, [accountsQuery, creditCardsQuery, invoiceTransactionsQuery]);

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
    return cards.map((c, index) => {
      const available = Math.max(0, c.limit - c.usedAmount);
      return {
        id: c.id,
        name: c.name,
        availableLimitMajor: centsToMajor(available),
        variant: index % 2 === 0 ? 'navy' : 'green'
      };
    });
  }, [creditCardsQuery.data]);

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
    if (!selectedCard || !openCycle || !selectedCardId) return null;
    const today = new Date();
    const todayYmd = ymdFromLocalDate(today);
    const totalCents = sumUnpaidCardExpensesInRange(
      invoiceTransactionsQuery.data ?? [],
      selectedCardId,
      openCycle.start,
      openCycle.end,
      todayYmd
    );
    return {
      totalMajor: centsToMajor(totalCents),
      dueInDays: daysUntilNextDueDay(selectedCard.dueDay, today),
      cardName: selectedCard.name
    };
  }, [
    selectedCard,
    openCycle,
    selectedCardId,
    invoiceTransactionsQuery.data
  ]);

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

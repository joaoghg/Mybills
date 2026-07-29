import {
  listAccounts,
  listCategories,
  listCreditCards,
  listTransactions,
  payCreditCardInvoice
} from '@mybills/api-client';
import type {
  AccountOutput,
  CategoryIcon,
  CreditCardOutput,
  PayCreditCardInvoiceInput,
  TransactionOutput
} from '@mybills/dtos';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useHttpClient } from '@/core/api/http-client-provider';
import {
  canPayBillingCycle,
  getOpenBillingCycleRange,
  shiftBillingCycle
} from '@/shared/lib/billing-cycle';
import {
  groupTransactionsByDate,
  type HistoryTransactionRow,
  type TransactionDateSection
} from '@/shared/lib/group-transactions-by-date';
import type { RecentTimeLabels } from '@/shared/lib/recent-transactions';
import { mapTransactionToRecentRow } from '@/shared/lib/recent-transactions';
import { centsToMajor } from '@/shared/utils/cents-to-major';

const STALE_MS = 45_000;

export type InvoiceCycleRange = { start: string; end: string };

export type InvoiceAccountOption = {
  id: string;
  name: string;
  balanceMajor: number;
};

function compareYmd(a: string, b: string): number {
  const aa = a.slice(0, 10);
  const bb = b.slice(0, 10);
  if (aa === bb) return 0;
  return aa < bb ? -1 : 1;
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

function toInvoiceRow(
  tx: TransactionOutput,
  categoryName: string | undefined,
  categoryIcon: CategoryIcon | undefined,
  locale: string,
  timeLabels: RecentTimeLabels
): HistoryTransactionRow {
  const base = mapTransactionToRecentRow(tx, categoryName, categoryIcon, locale, timeLabels);

  return {
    ...base,
    dateYmd: tx.date.slice(0, 10),
    txType: tx.type,
    amountCents: tx.amount,
    subtitle: buildSubtitle(categoryName, tx.createdAt, locale)
  };
}

function formatCycleRangeLabel(cycle: InvoiceCycleRange, locale: string): string {
  const startParts = cycle.start.slice(0, 10).split('-').map((p) => Number(p));
  const endParts = cycle.end.slice(0, 10).split('-').map((p) => Number(p));
  const startDate = new Date(startParts[0] ?? 1970, (startParts[1] ?? 1) - 1, startParts[2] ?? 1);
  const endDate = new Date(endParts[0] ?? 1970, (endParts[1] ?? 1) - 1, endParts[2] ?? 1);

  try {
    const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
    return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
  } catch {
    return `${cycle.start.slice(0, 10)} – ${cycle.end.slice(0, 10)}`;
  }
}

function sumUnpaidCents(transactions: TransactionOutput[]): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue;
    if (tx.isPaid) continue;
    if (tx.isProjected) continue;
    sum += tx.amount;
  }
  return sum;
}

export function useInvoiceDetail(
  cardId: string | null,
  enabled: boolean,
  locale: string,
  timeLabels: RecentTimeLabels,
  t: TFunction
): {
  card: CreditCardOutput | null;
  accounts: InvoiceAccountOption[];
  cycle: InvoiceCycleRange | null;
  cycleLabel: string;
  isOpenCycle: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  goToPreviousCycle: () => void;
  goToNextCycle: () => void;
  sections: TransactionDateSection[];
  totalUnpaidMajor: number;
  hasUnpaid: boolean;
  canPay: boolean;
  isOverdue: boolean;
  needsAccountPicker: boolean;
  linkedAccountId: string | null;
  isLoading: boolean;
  isError: boolean;
  isPaying: boolean;
  payError: string | null;
  paySuccess: boolean;
  refetch: () => Promise<void>;
  payInvoice: (accountId?: string) => Promise<void>;
  clearPayFeedback: () => void;
} {
  const client = useHttpClient();
  const queryClient = useQueryClient();
  const [cycle, setCycle] = useState<InvoiceCycleRange | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paySuccess, setPaySuccess] = useState(false);

  const creditCardsQuery = useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => listCreditCards(client),
    staleTime: STALE_MS,
    enabled
  });

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => listAccounts(client),
    staleTime: STALE_MS,
    enabled
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(client),
    staleTime: STALE_MS,
    enabled
  });

  const card = useMemo((): CreditCardOutput | null => {
    if (!cardId) return null;
    return (creditCardsQuery.data ?? []).find((c) => c.id === cardId) ?? null;
  }, [cardId, creditCardsQuery.data]);

  const openCycle = useMemo((): InvoiceCycleRange | null => {
    if (!card) return null;
    return getOpenBillingCycleRange(card.closingDay, new Date());
  }, [card]);

  useEffect(() => {
    if (!enabled || !openCycle) return;
    setCycle(openCycle);
    setPayError(null);
    setPaySuccess(false);
  }, [enabled, cardId, openCycle?.start, openCycle?.end]);

  const transactionsQuery = useQuery({
    queryKey: [
      'transactions',
      'invoice',
      cardId,
      cycle?.start,
      cycle?.end
    ],
    queryFn: () =>
      listTransactions(client, {
        cardId: cardId!,
        from: cycle!.start,
        to: cycle!.end,
        type: 'EXPENSE',
        isProjected: false
      }),
    staleTime: STALE_MS,
    enabled: enabled && Boolean(cardId) && Boolean(cycle)
  });

  const isLoading =
    (enabled &&
      (creditCardsQuery.isPending ||
        accountsQuery.isPending ||
        categoriesQuery.isPending ||
        (Boolean(cycle) && transactionsQuery.isPending))) ||
    false;

  const isError =
    creditCardsQuery.isError ||
    accountsQuery.isError ||
    categoriesQuery.isError ||
    transactionsQuery.isError;

  const refetch = useCallback(async () => {
    await Promise.all([
      creditCardsQuery.refetch(),
      accountsQuery.refetch(),
      categoriesQuery.refetch(),
      transactionsQuery.refetch()
    ]);
  }, [creditCardsQuery, accountsQuery, categoriesQuery, transactionsQuery]);

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
    return txs.map((tx) => {
      const categoryName = tx.categoryId ? categoryNameById.get(tx.categoryId) : undefined;
      const categoryIcon = tx.categoryId ? categoryIconById.get(tx.categoryId) : undefined;
      return toInvoiceRow(tx, categoryName, categoryIcon, locale, timeLabels);
    });
  }, [transactionsQuery.data, categoryNameById, categoryIconById, locale, timeLabels]);

  const sections = useMemo(() => groupTransactionsByDate(rows, t), [rows, t]);

  const unpaidCents = useMemo(
    () => sumUnpaidCents(transactionsQuery.data ?? []),
    [transactionsQuery.data]
  );
  const hasUnpaid = unpaidCents > 0;
  const totalUnpaidMajor = centsToMajor(unpaidCents);

  const canPay = Boolean(
    cycle && hasUnpaid && canPayBillingCycle(cycle.end, new Date())
  );
  const isOverdue = canPay;
  const isOpenCycle = Boolean(
    cycle && openCycle && compareYmd(cycle.end, openCycle.end) === 0
  );
  const canGoNext = Boolean(
    cycle && openCycle && compareYmd(cycle.end, openCycle.end) < 0
  );
  const canGoPrevious = Boolean(card && cycle);

  const goToPreviousCycle = useCallback(() => {
    if (!card || !cycle) return;
    setCycle(shiftBillingCycle(card.closingDay, cycle, -1));
    setPayError(null);
    setPaySuccess(false);
  }, [card, cycle]);

  const goToNextCycle = useCallback(() => {
    if (!card || !cycle || !openCycle) return;
    if (compareYmd(cycle.end, openCycle.end) >= 0) return;
    const next = shiftBillingCycle(card.closingDay, cycle, 1);
    if (compareYmd(next.end, openCycle.end) > 0) return;
    setCycle(next);
    setPayError(null);
    setPaySuccess(false);
  }, [card, cycle, openCycle]);

  const accounts = useMemo((): InvoiceAccountOption[] => {
    const list: AccountOutput[] = accountsQuery.data ?? [];
    return [...list]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((a) => ({
        id: a.id,
        name: a.name,
        balanceMajor: centsToMajor(a.balance)
      }));
  }, [accountsQuery.data]);

  const linkedAccountId = card?.accountId ?? null;
  const needsAccountPicker = canPay && !linkedAccountId;

  const payMutation = useMutation({
    mutationFn: async (body: PayCreditCardInvoiceInput) => {
      if (!cardId) throw new Error('Missing cardId');
      return payCreditCardInvoice(client, cardId, body);
    },
    onSuccess: async () => {
      setPaySuccess(true);
      setPayError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      ]);
    },
    onError: (error: unknown) => {
      setPaySuccess(false);
      setPayError(error instanceof Error ? error.message : String(error));
    }
  });

  const payInvoice = useCallback(
    async (accountId?: string) => {
      if (!cycle || !canPay) return;
      const resolvedAccountId = linkedAccountId ?? accountId;
      if (!resolvedAccountId) {
        setPayError('account_required');
        return;
      }
      setPayError(null);
      setPaySuccess(false);
      await payMutation.mutateAsync({
        cycleEnd: cycle.end,
        accountId: linkedAccountId ? undefined : resolvedAccountId
      });
    },
    [cycle, canPay, linkedAccountId, payMutation]
  );

  const clearPayFeedback = useCallback(() => {
    setPayError(null);
    setPaySuccess(false);
  }, []);

  const cycleLabel = cycle ? formatCycleRangeLabel(cycle, locale) : '';

  return {
    card,
    accounts,
    cycle,
    cycleLabel,
    isOpenCycle,
    canGoPrevious,
    canGoNext,
    goToPreviousCycle,
    goToNextCycle,
    sections,
    totalUnpaidMajor,
    hasUnpaid,
    canPay,
    isOverdue,
    needsAccountPicker,
    linkedAccountId,
    isLoading,
    isError,
    isPaying: payMutation.isPending,
    payError,
    paySuccess,
    refetch,
    payInvoice,
    clearPayFeedback
  };
}

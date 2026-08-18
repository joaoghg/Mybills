import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { openFinanceKeys } from '@/features/open-finance/hooks/use-open-finance-connections';
import {
  fetchInvestment,
  fetchInvestmentTransactions,
  fetchInvestments
} from '@/features/open-finance/services/investments.service';

export function useInvestments() {
  const client = useHttpClient();

  return useQuery({
    queryKey: openFinanceKeys.investments,
    queryFn: () => fetchInvestments(client)
  });
}

export function useInvestment(investmentId: string) {
  const client = useHttpClient();

  return useQuery({
    queryKey: openFinanceKeys.investment(investmentId),
    queryFn: () => fetchInvestment(client, investmentId)
  });
}

export function useInvestmentTransactions(investmentId: string) {
  const client = useHttpClient();

  return useQuery({
    queryKey: openFinanceKeys.investmentTransactions(investmentId),
    queryFn: () => fetchInvestmentTransactions(client, investmentId)
  });
}

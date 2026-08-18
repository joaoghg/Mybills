import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { fetchOpenFinanceConnections } from '@/features/open-finance/services/open-finance.service';

export const openFinanceKeys = {
  connections: ['open-finance', 'connections'] as const,
  investments: ['open-finance', 'investments'] as const,
  investment: (id: string) => ['open-finance', 'investments', id] as const,
  investmentTransactions: (id: string) =>
    ['open-finance', 'investments', id, 'transactions'] as const,
  syncRun: (connectionId: string, runId: string) =>
    ['open-finance', 'sync-run', connectionId, runId] as const
};

export function useOpenFinanceConnections() {
  const client = useHttpClient();

  return useQuery({
    queryKey: openFinanceKeys.connections,
    queryFn: () => fetchOpenFinanceConnections(client)
  });
}

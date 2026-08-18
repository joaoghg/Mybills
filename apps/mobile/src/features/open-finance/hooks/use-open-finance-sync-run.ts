import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { fetchSyncRun } from '@/features/open-finance/services/open-finance.service';
import { openFinanceKeys } from '@/features/open-finance/hooks/use-open-finance-connections';

export function useOpenFinanceSyncRun(connectionId: string | null, syncRunId: string | null) {
  const client = useHttpClient();

  return useQuery({
    queryKey:
      connectionId && syncRunId
        ? openFinanceKeys.syncRun(connectionId, syncRunId)
        : ['open-finance', 'sync-run', 'idle'],
    queryFn: () => fetchSyncRun(client, connectionId as string, syncRunId as string),
    enabled: Boolean(connectionId && syncRunId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'PENDING' || status === 'RUNNING') {
        return 2000;
      }
      return false;
    }
  });
}

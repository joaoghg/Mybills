import { openFinanceDisconnectCacheKeys } from '@mybills/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { openFinanceKeys } from '@/features/open-finance/hooks/use-open-finance-connections';
import {
  disconnectConnection,
  registerOpenFinanceConnection,
  startConnectionSync
} from '@/features/open-finance/services/open-finance.service';

export function useRegisterOpenFinanceConnection() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => registerOpenFinanceConnection(client, { itemId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: openFinanceKeys.connections });
    }
  });
}

export function useDisconnectOpenFinanceConnection() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => disconnectConnection(client, connectionId),
    onSuccess: async () => {
      await Promise.all(
        openFinanceDisconnectCacheKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [...queryKey] })
        )
      );
    }
  });
}

export function useStartOpenFinanceSync() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId: string) => startConnectionSync(client, connectionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: openFinanceKeys.connections });
    }
  });
}

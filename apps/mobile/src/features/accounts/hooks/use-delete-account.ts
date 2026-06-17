import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { deleteUserAccount } from '@/features/accounts/services/accounts.service';

export function useDeleteAccount() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => deleteUserAccount(client, accountId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      ]);
    }
  });
}

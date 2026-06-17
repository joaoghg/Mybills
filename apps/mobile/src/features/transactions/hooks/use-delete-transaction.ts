import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { deleteUserTransaction } from '@/features/transactions/services/transactions.service';

export function useDeleteTransaction() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => deleteUserTransaction(client, transactionId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      ]);
    }
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TransactionSeriesScope } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { deleteUserTransaction } from '@/features/transactions/services/transactions.service';

type DeleteTransactionVariables = {
  transactionId: string;
  scope?: TransactionSeriesScope;
};

export function useDeleteTransaction() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, scope }: DeleteTransactionVariables) =>
      deleteUserTransaction(client, transactionId, scope),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] })
      ]);
    }
  });
}

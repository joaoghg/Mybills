import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTransactionInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { updateUserTransaction } from '@/features/transactions/services/transactions.service';

type UpdateTransactionVariables = {
  transactionId: string;
  input: UpdateTransactionInput;
};

export function useUpdateTransaction() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, input }: UpdateTransactionVariables) =>
      updateUserTransaction(client, transactionId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      ]);
    }
  });
}

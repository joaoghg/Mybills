import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTransactionInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import {
  updateUserTransaction,
  updateUserTransactionIsPaid
} from '@/features/transactions/services/transactions.service';

type UpdateTransactionVariables = {
  transactionId: string;
  input: UpdateTransactionInput;
  /** When set, flips isPaid after the general update and before cache invalidation. */
  nextIsPaid?: boolean;
};

export function useUpdateTransaction() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, input, nextIsPaid }: UpdateTransactionVariables) => {
      const updated = await updateUserTransaction(client, transactionId, input);

      if (nextIsPaid === undefined) {
        return updated;
      }

      return updateUserTransactionIsPaid(client, transactionId, { isPaid: nextIsPaid });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      ]);
    }
  });
}

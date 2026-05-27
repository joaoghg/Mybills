import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateTransactionInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { createUserTransaction } from '@/features/transactions/services/transactions.service';

export function useCreateTransaction() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createUserTransaction(client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      ]);
    }
  });
}

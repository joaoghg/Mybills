import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateTransferInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { createUserTransfer } from '@/features/transactions/services/transfers.service';

export function useCreateTransfer() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransferInput) => createUserTransfer(client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      ]);
    }
  });
}

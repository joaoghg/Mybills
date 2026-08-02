import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateTransferInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { updateUserTransfer } from '@/features/transfers/services/transfers.service';

type UpdateTransferVariables = {
  transferGroupId: string;
  input: UpdateTransferInput;
};

export function useUpdateTransfer() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transferGroupId, input }: UpdateTransferVariables) =>
      updateUserTransfer(client, transferGroupId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['transfers'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] })
      ]);
    }
  });
}

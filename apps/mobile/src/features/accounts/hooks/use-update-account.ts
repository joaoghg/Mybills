import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateAccountInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { updateUserAccount } from '@/features/accounts/services/accounts.service';

type UpdateAccountVariables = {
  accountId: string;
  input: UpdateAccountInput;
};

export function useUpdateAccount() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, input }: UpdateAccountVariables) =>
      updateUserAccount(client, accountId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}

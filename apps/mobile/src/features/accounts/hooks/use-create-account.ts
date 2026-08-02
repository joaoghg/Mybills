import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateAccountInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { createUserAccount } from '@/features/accounts/services/accounts.service';

export function useCreateAccount() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) => createUserAccount(client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
}

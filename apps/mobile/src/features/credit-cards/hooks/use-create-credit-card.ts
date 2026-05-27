import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCreditCardInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { createUserCreditCard } from '@/features/credit-cards/services/credit-cards.service';

export function useCreateCreditCard() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCreditCardInput) => createUserCreditCard(client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });
}

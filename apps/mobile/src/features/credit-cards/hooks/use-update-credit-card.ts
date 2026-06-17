import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateCreditCardInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { updateUserCreditCard } from '@/features/credit-cards/services/credit-cards.service';

type UpdateCreditCardVariables = {
  cardId: string;
  input: UpdateCreditCardInput;
};

export function useUpdateCreditCard() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cardId, input }: UpdateCreditCardVariables) =>
      updateUserCreditCard(client, cardId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
    }
  });
}

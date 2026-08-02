import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { deleteUserCreditCard } from '@/features/credit-cards/services/credit-cards.service';

export function useDeleteCreditCard() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cardId: string) => deleteUserCreditCard(client, cardId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      ]);
    }
  });
}

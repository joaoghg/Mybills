import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { fetchUserCreditCards } from '@/features/credit-cards/services/credit-cards.service';

export function useCreditCards() {
  const client = useHttpClient();

  return useQuery({
    queryKey: ['credit-cards'],
    queryFn: () => fetchUserCreditCards(client)
  });
}

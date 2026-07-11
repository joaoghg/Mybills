import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { getUserTransaction } from '@/features/transactions/services/transactions.service';

export function useTransaction(transactionId: string) {
  const client = useHttpClient();

  return useQuery({
    queryKey: ['transactions', transactionId],
    queryFn: () => getUserTransaction(client, transactionId)
  });
}

import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { getUserTransfer } from '@/features/transfers/services/transfers.service';

export function useTransfer(transferGroupId: string) {
  const client = useHttpClient();

  return useQuery({
    queryKey: ['transfers', transferGroupId],
    queryFn: () => getUserTransfer(client, transferGroupId)
  });
}

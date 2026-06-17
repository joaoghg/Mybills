import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { fetchUserAccounts } from '@/features/accounts/services/accounts.service';

export function useAccounts() {
  const client = useHttpClient();

  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => fetchUserAccounts(client)
  });
}

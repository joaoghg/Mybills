import { getMe } from '@mybills/api-client';
import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';

export function useCurrentUser() {
  const client = useHttpClient();

  return useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(client),
    staleTime: Infinity
  });
}

export function firstNameFromUserName(name: string | undefined): string {
  if (!name?.trim()) return '';
  return name.trim().split(/\s+/)[0] ?? name;
}

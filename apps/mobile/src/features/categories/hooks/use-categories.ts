import { useQuery } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { fetchUserCategories } from '@/features/categories/services/categories.service';

export function useCategories() {
  const client = useHttpClient();

  return useQuery({
    queryKey: ['categories'],
    queryFn: () => fetchUserCategories(client)
  });
}

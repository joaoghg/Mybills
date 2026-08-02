import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useHttpClient } from '@/core/api/http-client-provider';
import { deleteUserCategory } from '@/features/categories/services/categories.service';

export function useDeleteCategory() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (categoryId: string) => deleteUserCategory(client, categoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

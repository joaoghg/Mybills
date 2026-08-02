import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCategoryInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { createUserCategory } from '@/features/categories/services/categories.service';

export function useCreateCategory() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCategoryInput) => createUserCategory(client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

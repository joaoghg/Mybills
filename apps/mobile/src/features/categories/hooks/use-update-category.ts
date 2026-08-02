import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateCategoryInput } from '@mybills/dtos';

import { useHttpClient } from '@/core/api/http-client-provider';
import { updateUserCategory } from '@/features/categories/services/categories.service';

type UpdateCategoryVariables = {
  categoryId: string;
  input: UpdateCategoryInput;
};

export function useUpdateCategory() {
  const client = useHttpClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ categoryId, input }: UpdateCategoryVariables) =>
      updateUserCategory(client, categoryId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });
}

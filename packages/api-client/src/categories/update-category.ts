import {
  categoryOutputSchema,
  type CategoryOutput,
  type UpdateCategoryInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function updateCategory(
  client: HttpClient,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategoryOutput> {
  const raw = await client.patchJson<unknown>(`/categories/${categoryId}`, input);
  return categoryOutputSchema.parse(raw);
}

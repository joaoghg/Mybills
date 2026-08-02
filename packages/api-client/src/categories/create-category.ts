import {
  categoryOutputSchema,
  type CategoryOutput,
  type CreateCategoryInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function createCategory(
  client: HttpClient,
  input: CreateCategoryInput
): Promise<CategoryOutput> {
  const raw = await client.postJson<unknown>('/categories', input);
  return categoryOutputSchema.parse(raw);
}

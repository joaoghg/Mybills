import { createCategory } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { CategoryOutput, CreateCategoryInput } from '@mybills/dtos';

export function createUserCategory(
  client: HttpClient,
  input: CreateCategoryInput
): Promise<CategoryOutput> {
  return createCategory(client, input);
}

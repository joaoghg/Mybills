import { listCategoriesOutputSchema, type ListCategoriesOutput } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function listCategories(client: HttpClient): Promise<ListCategoriesOutput> {
  const raw = await client.getJson<unknown>('/categories');
  return listCategoriesOutputSchema.parse(raw);
}

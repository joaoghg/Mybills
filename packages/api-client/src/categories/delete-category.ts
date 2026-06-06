import type { HttpClient } from '../http-client.js';

export async function deleteCategory(client: HttpClient, categoryId: string): Promise<void> {
  await client.deleteJson(`/categories/${categoryId}`);
}

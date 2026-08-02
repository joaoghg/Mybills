import { listAccountsOutputSchema, type ListAccountsOutput } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function listAccounts(client: HttpClient): Promise<ListAccountsOutput> {
  const raw = await client.getJson<unknown>('/accounts');
  return listAccountsOutputSchema.parse(raw);
}

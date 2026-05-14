import { listTransactionsOutputSchema, type ListTransactionsOutput } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function listTransactions(client: HttpClient): Promise<ListTransactionsOutput> {
  const raw = await client.getJson<unknown>('/transactions');
  return listTransactionsOutputSchema.parse(raw);
}

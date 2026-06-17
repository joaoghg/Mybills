import { transactionOutputSchema, type TransactionOutput } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function getTransaction(
  client: HttpClient,
  transactionId: string
): Promise<TransactionOutput> {
  const raw = await client.getJson<unknown>(`/transactions/${transactionId}`);
  return transactionOutputSchema.parse(raw);
}

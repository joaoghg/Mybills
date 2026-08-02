import {
  transactionOutputSchema,
  type CreateTransactionInput,
  type TransactionOutput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function createTransaction(
  client: HttpClient,
  input: CreateTransactionInput
): Promise<TransactionOutput> {
  const raw = await client.postJson<unknown>('/transactions', input);
  return transactionOutputSchema.parse(raw);
}

import {
  transactionOutputSchema,
  type TransactionOutput,
  type UpdateTransactionInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function updateTransaction(
  client: HttpClient,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<TransactionOutput> {
  const raw = await client.patchJson<unknown>(`/transactions/${transactionId}`, input);
  return transactionOutputSchema.parse(raw);
}

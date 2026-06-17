import {
  transactionOutputSchema,
  type TransactionOutput,
  type UpdateTransactionIsPaidInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function updateTransactionIsPaid(
  client: HttpClient,
  transactionId: string,
  input: UpdateTransactionIsPaidInput
): Promise<TransactionOutput> {
  const raw = await client.patchJson<unknown>(`/transactions/${transactionId}/is-paid`, input);
  return transactionOutputSchema.parse(raw);
}

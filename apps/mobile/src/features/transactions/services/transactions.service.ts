import { createTransaction } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { CreateTransactionInput, TransactionOutput } from '@mybills/dtos';

export function createUserTransaction(
  client: HttpClient,
  input: CreateTransactionInput
): Promise<TransactionOutput> {
  return createTransaction(client, input);
}

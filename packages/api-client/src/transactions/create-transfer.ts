import {
  createTransferOutputSchema,
  type CreateTransferInput,
  type CreateTransferOutput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function createTransfer(
  client: HttpClient,
  input: CreateTransferInput
): Promise<CreateTransferOutput> {
  const raw = await client.postJson<unknown>('/transactions/transfer', input);
  return createTransferOutputSchema.parse(raw);
}

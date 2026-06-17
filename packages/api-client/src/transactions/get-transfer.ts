import { createTransferOutputSchema, type CreateTransferOutput } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function getTransfer(
  client: HttpClient,
  transferGroupId: string
): Promise<CreateTransferOutput> {
  const raw = await client.getJson<unknown>(`/transactions/transfer/${transferGroupId}`);
  return createTransferOutputSchema.parse(raw);
}

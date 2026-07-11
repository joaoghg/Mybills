import {
  createTransferOutputSchema,
  type CreateTransferOutput,
  type UpdateTransferInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function updateTransfer(
  client: HttpClient,
  transferGroupId: string,
  input: UpdateTransferInput
): Promise<CreateTransferOutput> {
  const raw = await client.patchJson<unknown>(
    `/transactions/transfer/${transferGroupId}`,
    input
  );
  return createTransferOutputSchema.parse(raw);
}

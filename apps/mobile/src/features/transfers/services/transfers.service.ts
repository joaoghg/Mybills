import { createTransfer } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { CreateTransferInput, CreateTransferOutput } from '@mybills/dtos';

export function createUserTransfer(
  client: HttpClient,
  input: CreateTransferInput
): Promise<CreateTransferOutput> {
  return createTransfer(client, input);
}

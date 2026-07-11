import { createTransfer, getTransfer, updateTransfer } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { CreateTransferInput, CreateTransferOutput, UpdateTransferInput } from '@mybills/dtos';

export function createUserTransfer(
  client: HttpClient,
  input: CreateTransferInput
): Promise<CreateTransferOutput> {
  return createTransfer(client, input);
}

export function getUserTransfer(
  client: HttpClient,
  transferGroupId: string
): Promise<CreateTransferOutput> {
  return getTransfer(client, transferGroupId);
}

export function updateUserTransfer(
  client: HttpClient,
  transferGroupId: string,
  input: UpdateTransferInput
): Promise<CreateTransferOutput> {
  return updateTransfer(client, transferGroupId, input);
}

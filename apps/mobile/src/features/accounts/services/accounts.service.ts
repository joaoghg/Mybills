import { createAccount } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { AccountOutput, CreateAccountInput } from '@mybills/dtos';

export function createUserAccount(
  client: HttpClient,
  input: CreateAccountInput
): Promise<AccountOutput> {
  return createAccount(client, input);
}

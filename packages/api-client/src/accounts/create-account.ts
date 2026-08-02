import {
  accountOutputSchema,
  type AccountOutput,
  type CreateAccountInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function createAccount(
  client: HttpClient,
  input: CreateAccountInput
): Promise<AccountOutput> {
  const raw = await client.postJson<unknown>('/accounts', input);
  return accountOutputSchema.parse(raw);
}

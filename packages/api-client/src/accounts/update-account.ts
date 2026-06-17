import {
  accountOutputSchema,
  type AccountOutput,
  type UpdateAccountInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function updateAccount(
  client: HttpClient,
  accountId: string,
  input: UpdateAccountInput
): Promise<AccountOutput> {
  const raw = await client.patchJson<unknown>(`/accounts/${accountId}`, input);
  return accountOutputSchema.parse(raw);
}

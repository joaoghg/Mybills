import { createAccount, deleteAccount, listAccounts, updateAccount } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type {
  AccountOutput,
  CreateAccountInput,
  ListAccountsOutput,
  UpdateAccountInput
} from '@mybills/dtos';

export function fetchUserAccounts(client: HttpClient): Promise<ListAccountsOutput> {
  return listAccounts(client);
}

export function createUserAccount(
  client: HttpClient,
  input: CreateAccountInput
): Promise<AccountOutput> {
  return createAccount(client, input);
}

export function updateUserAccount(
  client: HttpClient,
  accountId: string,
  input: UpdateAccountInput
): Promise<AccountOutput> {
  return updateAccount(client, accountId, input);
}

export function deleteUserAccount(client: HttpClient, accountId: string): Promise<void> {
  return deleteAccount(client, accountId);
}

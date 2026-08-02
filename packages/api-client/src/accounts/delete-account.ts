import type { HttpClient } from '../http-client.js';

export async function deleteAccount(client: HttpClient, accountId: string): Promise<void> {
  await client.deleteJson(`/accounts/${accountId}`);
}

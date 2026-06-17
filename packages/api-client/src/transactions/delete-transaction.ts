import type { HttpClient } from '../http-client.js';

export async function deleteTransaction(client: HttpClient, transactionId: string): Promise<void> {
  await client.deleteJson(`/transactions/${transactionId}`);
}

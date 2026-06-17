import type { HttpClient } from '../http-client.js';

export async function deleteCreditCard(client: HttpClient, cardId: string): Promise<void> {
  await client.deleteJson(`/credit-cards/${cardId}`);
}

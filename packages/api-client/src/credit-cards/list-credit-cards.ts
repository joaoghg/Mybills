import { listCreditCardsOutputSchema, type ListCreditCardsOutput } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function listCreditCards(client: HttpClient): Promise<ListCreditCardsOutput> {
  const raw = await client.getJson<unknown>('/credit-cards');
  return listCreditCardsOutputSchema.parse(raw);
}

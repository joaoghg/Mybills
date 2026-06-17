import {
  creditCardOutputSchema,
  type CreditCardOutput,
  type UpdateCreditCardInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function updateCreditCard(
  client: HttpClient,
  cardId: string,
  input: UpdateCreditCardInput
): Promise<CreditCardOutput> {
  const raw = await client.patchJson<unknown>(`/credit-cards/${cardId}`, input);
  return creditCardOutputSchema.parse(raw);
}

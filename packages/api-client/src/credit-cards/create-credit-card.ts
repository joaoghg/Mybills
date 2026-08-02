import {
  creditCardOutputSchema,
  type CreateCreditCardInput,
  type CreditCardOutput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function createCreditCard(
  client: HttpClient,
  input: CreateCreditCardInput
): Promise<CreditCardOutput> {
  const raw = await client.postJson<unknown>('/credit-cards', input);
  return creditCardOutputSchema.parse(raw);
}

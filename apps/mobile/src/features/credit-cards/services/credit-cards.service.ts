import { createCreditCard } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { CreateCreditCardInput, CreditCardOutput } from '@mybills/dtos';

export function createUserCreditCard(
  client: HttpClient,
  input: CreateCreditCardInput
): Promise<CreditCardOutput> {
  return createCreditCard(client, input);
}

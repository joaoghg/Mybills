import {
  createCreditCard,
  deleteCreditCard,
  listCreditCards,
  updateCreditCard
} from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type {
  CreateCreditCardInput,
  CreditCardOutput,
  ListCreditCardsOutput,
  UpdateCreditCardInput
} from '@mybills/dtos';

export function fetchUserCreditCards(client: HttpClient): Promise<ListCreditCardsOutput> {
  return listCreditCards(client);
}

export function createUserCreditCard(
  client: HttpClient,
  input: CreateCreditCardInput
): Promise<CreditCardOutput> {
  return createCreditCard(client, input);
}

export function updateUserCreditCard(
  client: HttpClient,
  cardId: string,
  input: UpdateCreditCardInput
): Promise<CreditCardOutput> {
  return updateCreditCard(client, cardId, input);
}

export function deleteUserCreditCard(client: HttpClient, cardId: string): Promise<void> {
  return deleteCreditCard(client, cardId);
}

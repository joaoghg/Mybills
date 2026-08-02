import {
  payCreditCardInvoiceOutputSchema,
  type PayCreditCardInvoiceInput,
  type PayCreditCardInvoiceOutput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function payCreditCardInvoice(
  client: HttpClient,
  cardId: string,
  input: PayCreditCardInvoiceInput
): Promise<PayCreditCardInvoiceOutput> {
  const raw = await client.postJson<unknown>(`/credit-cards/${cardId}/pay-invoice`, input);
  return payCreditCardInvoiceOutputSchema.parse(raw);
}

import {
  invoiceOutputSchema,
  listInvoicesOutputSchema,
  type InvoiceOutput,
  type ListInvoicesOutput,
  type ListInvoicesQueryInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

function toQuery(params: ListInvoicesQueryInput): string {
  if (!params.status) {
    return '';
  }
  return `?status=${encodeURIComponent(params.status)}`;
}

export async function listCreditCardInvoices(
  client: HttpClient,
  cardId: string,
  query: ListInvoicesQueryInput = {}
): Promise<ListInvoicesOutput> {
  const raw = await client.getJson<unknown>(`/credit-cards/${cardId}/invoices${toQuery(query)}`);
  return listInvoicesOutputSchema.parse(raw);
}

export async function getCreditCardInvoice(
  client: HttpClient,
  cardId: string,
  invoiceId: string
): Promise<InvoiceOutput> {
  const raw = await client.getJson<unknown>(`/credit-cards/${cardId}/invoices/${invoiceId}`);
  return invoiceOutputSchema.parse(raw);
}

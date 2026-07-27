import {
  listTransactionsOutputSchema,
  type ListTransactionsOutput,
  type ListTransactionsQueryInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

function buildQueryString(query: ListTransactionsQueryInput): string {
  const params = new URLSearchParams();

  if (query.month !== undefined) {
    params.set('month', String(query.month));
  }
  if (query.year !== undefined) {
    params.set('year', String(query.year));
  }
  if (query.from !== undefined) {
    params.set('from', query.from);
  }
  if (query.to !== undefined) {
    params.set('to', query.to);
  }
  if (query.search !== undefined) {
    params.set('search', query.search);
  }
  if (query.categoryId !== undefined) {
    params.set('categoryId', query.categoryId);
  }
  if (query.accountId !== undefined) {
    params.set('accountId', query.accountId);
  }
  if (query.cardId !== undefined) {
    params.set('cardId', query.cardId);
  }
  if (query.type !== undefined) {
    params.set('type', query.type);
  }
  if (query.isPaid !== undefined) {
    params.set('isPaid', String(query.isPaid));
  }
  if (query.includeTransfer !== undefined) {
    params.set('includeTransfer', String(query.includeTransfer));
  }
  if (query.limit !== undefined) {
    params.set('limit', String(query.limit));
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
}

export async function listTransactions(
  client: HttpClient,
  query?: ListTransactionsQueryInput
): Promise<ListTransactionsOutput> {
  const path = `/transactions${query ? buildQueryString(query) : ''}`;
  const raw = await client.getJson<unknown>(path);
  return listTransactionsOutputSchema.parse(raw);
}

import type { DeleteTransactionQueryInput, TransactionSeriesScope } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function deleteTransaction(
  client: HttpClient,
  transactionId: string,
  query?: DeleteTransactionQueryInput | { scope?: TransactionSeriesScope }
): Promise<void> {
  const scope = query?.scope ?? 'SINGLE';
  const params = new URLSearchParams({ scope });
  await client.deleteJson(`/transactions/${transactionId}?${params.toString()}`);
}

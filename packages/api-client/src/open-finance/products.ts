import {
  InvestmentOutput,
  ListInvestmentTransactionsOutput,
  ListInvestmentsOutput,
  ListProviderBillsOutput,
  ResetOpenFinanceOverridesInput,
  investmentOutputSchema,
  listInvestmentTransactionsOutputSchema,
  listInvestmentsOutputSchema,
  listProviderBillsOutputSchema,
  resetOpenFinanceOverridesInputSchema
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function listInvestments(client: HttpClient): Promise<ListInvestmentsOutput> {
  const raw = await client.getJson<unknown>('/open-finance/investments');
  return listInvestmentsOutputSchema.parse(raw);
}

export async function getInvestment(
  client: HttpClient,
  investmentId: string
): Promise<InvestmentOutput> {
  const raw = await client.getJson<unknown>(`/open-finance/investments/${investmentId}`);
  return investmentOutputSchema.parse(raw);
}

export async function listInvestmentTransactions(
  client: HttpClient,
  investmentId: string
): Promise<ListInvestmentTransactionsOutput> {
  const raw = await client.getJson<unknown>(
    `/open-finance/investments/${investmentId}/transactions`
  );
  return listInvestmentTransactionsOutputSchema.parse(raw);
}

export async function listProviderBills(
  client: HttpClient,
  creditCardId: string
): Promise<ListProviderBillsOutput> {
  const raw = await client.getJson<unknown>(
    `/open-finance/credit-cards/${creditCardId}/bills`
  );
  return listProviderBillsOutputSchema.parse(raw);
}

export async function resetAccountOverrides(
  client: HttpClient,
  accountId: string,
  input: ResetOpenFinanceOverridesInput
): Promise<void> {
  const body = resetOpenFinanceOverridesInputSchema.parse(input);
  await client.postJson(
    `/open-finance/projections/accounts/${accountId}/reset-overrides`,
    body
  );
}

export async function resetTransactionOverrides(
  client: HttpClient,
  transactionId: string,
  input: ResetOpenFinanceOverridesInput
): Promise<void> {
  const body = resetOpenFinanceOverridesInputSchema.parse(input);
  await client.postJson(
    `/open-finance/projections/transactions/${transactionId}/reset-overrides`,
    body
  );
}

export async function resetCreditCardOverrides(
  client: HttpClient,
  creditCardId: string,
  input: ResetOpenFinanceOverridesInput
): Promise<void> {
  const body = resetOpenFinanceOverridesInputSchema.parse(input);
  await client.postJson(
    `/open-finance/projections/credit-cards/${creditCardId}/reset-overrides`,
    body
  );
}

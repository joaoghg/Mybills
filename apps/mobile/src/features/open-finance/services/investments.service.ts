import {
  getInvestment,
  listInvestmentTransactions,
  listInvestments
} from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type {
  InvestmentOutput,
  ListInvestmentTransactionsOutput,
  ListInvestmentsOutput
} from '@mybills/dtos';

export function fetchInvestments(client: HttpClient): Promise<ListInvestmentsOutput> {
  return listInvestments(client);
}

export function fetchInvestment(
  client: HttpClient,
  investmentId: string
): Promise<InvestmentOutput> {
  return getInvestment(client, investmentId);
}

export function fetchInvestmentTransactions(
  client: HttpClient,
  investmentId: string
): Promise<ListInvestmentTransactionsOutput> {
  return listInvestmentTransactions(client, investmentId);
}

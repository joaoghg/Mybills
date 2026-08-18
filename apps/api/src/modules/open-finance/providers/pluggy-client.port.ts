import type {
  Account,
  CreditCardBills,
  Investment,
  InvestmentTransaction,
  Item,
  Transaction
} from 'pluggy-sdk';

export type PluggyCursorPage<T> = {
  results: T[];
  next: string | null;
};

export type PluggyOffsetPage<T> = {
  results: T[];
  page: number;
  total: number;
  totalPages: number;
};

export type FetchTransactionsV2Params = {
  accountId: string;
  after?: string;
  dateFrom?: string;
  dateTo?: string;
  createdAtFrom?: string;
  ids?: string[];
};

export type FetchInvestmentTransactionsParams = {
  investmentId: string;
  page?: number;
  pageSize?: number;
};

export type FetchInvestmentsParams = {
  itemId: string;
  page?: number;
  pageSize?: number;
};

export type FetchBillsParams = {
  accountId: string;
  page?: number;
  pageSize?: number;
};

export interface PluggyClientPort {
  fetchItem(itemId: string): Promise<Item>;
  deleteItem(itemId: string): Promise<void>;
  fetchAccounts(itemId: string): Promise<Account[]>;
  fetchAccount(accountId: string): Promise<Account>;
  fetchCreditCardBills(params: FetchBillsParams): Promise<PluggyOffsetPage<CreditCardBills>>;
  fetchTransactionsPage(params: FetchTransactionsV2Params): Promise<PluggyCursorPage<Transaction>>;
  fetchAllTransactions(accountId: string): Promise<Transaction[]>;
  fetchTransactionsByIds(accountId: string, ids: string[]): Promise<Transaction[]>;
  fetchTransaction(transactionId: string): Promise<Transaction>;
  fetchTransactionsFromLink(createdTransactionsLink: string): Promise<Transaction[]>;
  fetchInvestmentsPage(params: FetchInvestmentsParams): Promise<PluggyOffsetPage<Investment>>;
  fetchInvestmentTransactionsPage(
    params: FetchInvestmentTransactionsParams
  ): Promise<PluggyOffsetPage<InvestmentTransaction>>;
}

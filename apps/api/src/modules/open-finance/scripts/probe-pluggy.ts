import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Item, type Account, type CreditCardBills, type Transaction } from 'pluggy-sdk';
import { Env } from 'src/config/env.validation';
import { MEU_PLUGGY_CONNECTOR_ID } from '../providers/pluggy.constants';
import { PluggySdkClientAdapter } from '../providers/pluggy-sdk.adapter';

type ProbeSummary = {
  itemId: string;
  connectorId: number | null;
  accepted: boolean;
  itemStatus: string | null;
  institutionName: string | null;
  accountCount: number;
  bankAccountCount: number;
  creditAccountCount: number;
  billCount: number;
  transactionCount: number;
  transactionDateFrom: string | null;
  transactionDateTo: string | null;
  transactionPageCount: number;
  investmentCount: number;
  investmentTransactionCount: number;
  errors: Array<{ code: string; product: string | null }>;
};

function createConfigService(): ConfigService<Env> {
  return new ConfigService<Env>({
    PLUGGY_CLIENT_ID: process.env.PLUGGY_CLIENT_ID,
    PLUGGY_CLIENT_SECRET: process.env.PLUGGY_CLIENT_SECRET
  });
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

async function probeItem(adapter: PluggySdkClientAdapter, itemId: string): Promise<ProbeSummary> {
  const logger = new Logger('OpenFinanceProbe');
  const summary: ProbeSummary = {
    itemId,
    connectorId: null,
    accepted: false,
    itemStatus: null,
    institutionName: null,
    accountCount: 0,
    bankAccountCount: 0,
    creditAccountCount: 0,
    billCount: 0,
    transactionCount: 0,
    transactionDateFrom: null,
    transactionDateTo: null,
    transactionPageCount: 0,
    investmentCount: 0,
    investmentTransactionCount: 0,
    errors: []
  };

  let item: Item;

  try {
    item = await adapter.fetchItem(itemId);
  } catch {
    summary.errors.push({ code: 'ITEM_UNAVAILABLE', product: null });
    logger.warn(`Item ${itemId} is unavailable`);
    return summary;
  }

  summary.connectorId = item.connector.id;
  summary.itemStatus = item.status;
  summary.institutionName = item.connector.name;
  summary.accepted = item.connector.id === MEU_PLUGGY_CONNECTOR_ID;

  if (!summary.accepted) {
    summary.errors.push({ code: 'INVALID_CONNECTOR', product: null });
  }

  let accounts: Account[] = [];

  try {
    accounts = await adapter.fetchAccounts(itemId);
    summary.accountCount = accounts.length;
    summary.bankAccountCount = accounts.filter((account) => account.type === 'BANK').length;
    summary.creditAccountCount = accounts.filter((account) => account.type === 'CREDIT').length;
  } catch {
    summary.errors.push({ code: 'ACCOUNTS_UNAVAILABLE', product: 'ACCOUNTS' });
  }

  for (const account of accounts) {
    if (account.type === 'CREDIT') {
      try {
        let page = 1;
        let totalPages = 1;

        do {
          const billsPage = await adapter.fetchCreditCardBills({
            accountId: account.id,
            page,
            pageSize: 500
          });
          summary.billCount += billsPage.results.length;
          totalPages = billsPage.totalPages;
          page += 1;
          void (billsPage.results as CreditCardBills[]);
        } while (page <= totalPages);
      } catch {
        summary.errors.push({ code: 'BILLS_UNAVAILABLE', product: 'CREDIT_CARDS' });
      }
    }

    try {
      let after: string | undefined;
      let hasMore = true;
      const dates: string[] = [];

      while (hasMore) {
        const page = await adapter.fetchTransactionsPage({
          accountId: account.id,
          after
        });
        summary.transactionPageCount += 1;
        summary.transactionCount += page.results.length;

        for (const transaction of page.results as Transaction[]) {
          const isoDate = toIsoDate(transaction.date);
          if (isoDate) {
            dates.push(isoDate);
          }
        }

        if (!page.next) {
          hasMore = false;
        } else {
          const afterMatch = page.next.match(/after=([^&]+)/);
          after = afterMatch?.[1] ? decodeURIComponent(afterMatch[1]) : undefined;
          hasMore = Boolean(after);
        }
      }

      dates.sort();
      if (dates[0] && (!summary.transactionDateFrom || dates[0] < summary.transactionDateFrom)) {
        summary.transactionDateFrom = dates[0];
      }
      const lastDate = dates[dates.length - 1];
      if (lastDate && (!summary.transactionDateTo || lastDate > summary.transactionDateTo)) {
        summary.transactionDateTo = lastDate;
      }
    } catch {
      summary.errors.push({ code: 'TRANSACTIONS_UNAVAILABLE', product: 'TRANSACTIONS' });
    }
  }

  try {
    let page = 1;
    let totalPages = 1;
    const investmentIds: string[] = [];

    do {
      const investmentsPage = await adapter.fetchInvestmentsPage({
        itemId,
        page,
        pageSize: 500
      });
      summary.investmentCount += investmentsPage.results.length;
      investmentIds.push(...investmentsPage.results.map((investment) => investment.id));
      totalPages = investmentsPage.totalPages;
      page += 1;
    } while (page <= totalPages);

    for (const investmentId of investmentIds) {
      let txPage = 1;
      let txTotalPages = 1;

      do {
        const tx = await adapter.fetchInvestmentTransactionsPage({
          investmentId,
          page: txPage,
          pageSize: 500
        });
        summary.investmentTransactionCount += tx.results.length;
        txTotalPages = tx.totalPages;
        txPage += 1;
      } while (txPage <= txTotalPages);
    }
  } catch {
    summary.errors.push({ code: 'INVESTMENTS_UNAVAILABLE', product: 'INVESTMENTS' });
  }

  return summary;
}

async function main(): Promise<void> {
  const itemIds = process.argv.filter((value) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );

  if (itemIds.length === 0) {
    throw new Error('Usage: ts-node probe-pluggy.ts <itemId> [itemId...]');
  }

  const adapter = new PluggySdkClientAdapter(createConfigService());
  const summaries: ProbeSummary[] = [];

  for (const itemId of itemIds) {
    summaries.push(await probeItem(adapter, itemId));
  }

  process.stdout.write(`${JSON.stringify(summaries, null, 2)}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

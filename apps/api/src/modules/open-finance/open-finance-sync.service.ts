import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenFinanceSyncRunOutput, OpenFinanceSyncTrigger } from '@mybills/dtos';
import type { CreditCardBills, Investment, InvestmentTransaction } from 'pluggy-sdk';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { Env } from 'src/config/env.validation';
import { openFinanceItemStatusSchema } from '@mybills/dtos';
import { mapPluggyAccount } from './mappers/map-account';
import { mapPluggyBill } from './mappers/map-bill';
import { mapPluggyInvestment, mapPluggyInvestmentTransaction } from './mappers/map-investment';
import { mapPluggyTransaction } from './mappers/map-transaction';
import { OPEN_FINANCE_CANONICAL_REPOSITORY, OPEN_FINANCE_SYNC_REPOSITORY } from './open-finance.tokens';
import { PLUGGY_CLIENT_PORT } from './providers/pluggy.constants';
import { PluggyClientPort } from './providers/pluggy-client.port';
import { OpenFinanceConnectionRepository } from './repositories/open-finance-connection.repository';
import { PrismaOpenFinanceCanonicalRepository } from './repositories/prisma/prisma-open-finance-canonical.repository';
import {
  ClaimedSyncRun,
  EnqueueSyncInput,
  OpenFinanceSyncRepository
} from './repositories/open-finance-sync.repository';

const providerError = {
  code: 'open_finance.provider_unavailable',
  i18nKey: 'errors.open_finance.provider_unavailable'
};

@Injectable()
export class OpenFinanceSyncService {
  private readonly logger = new Logger(OpenFinanceSyncService.name);

  constructor(
    private readonly configService: ConfigService<Env>,
    @Inject(PLUGGY_CLIENT_PORT) private readonly pluggyClient: PluggyClientPort,
    @Inject('OpenFinanceConnectionRepository')
    private readonly connections: OpenFinanceConnectionRepository,
    @Inject(OPEN_FINANCE_SYNC_REPOSITORY)
    private readonly syncRuns: OpenFinanceSyncRepository,
    @Inject(OPEN_FINANCE_CANONICAL_REPOSITORY)
    private readonly canonical: PrismaOpenFinanceCanonicalRepository
  ) {}

  async enqueueManual(connectionId: string, userId: string): Promise<OpenFinanceSyncRunOutput> {
    this.assertEnabled();
    const connection = await this.connections.findByIdAndUserId(connectionId, userId);
    if (!connection || connection.status !== 'ACTIVE') {
      throw new NotFoundError({
        code: 'open_finance.connection_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'connection' }
      });
    }

    return await this.enqueue({
      connectionId,
      trigger: 'MANUAL'
    });
  }

  async enqueue(input: EnqueueSyncInput): Promise<OpenFinanceSyncRunOutput> {
    return await this.syncRuns.enqueueOrCoalesce(input);
  }

  async enqueueStaleRuns(): Promise<void> {
    if (!this.configService.get('OPEN_FINANCE_ENABLED')) {
      return;
    }

    const hours = this.configService.get('PLUGGY_SYNC_STALE_HOURS', { infer: true }) ?? 24;
    const staleBefore = new Date(Date.now() - hours * 60 * 60 * 1000);
    const connectionIds = await this.syncRuns.findStaleConnectionIds(staleBefore);

    for (const connectionId of connectionIds) {
      await this.enqueue({ connectionId, trigger: 'STALE' });
    }
  }

  async executeClaimedRun(run: ClaimedSyncRun): Promise<'SUCCESS' | 'PARTIAL' | 'FAILED'> {
    const seenAt = new Date();
    const event = run.webhookEvent ?? '';
    const productFailures: string[] = [];

    try {
      const item = await this.pluggyClient.fetchItem(run.itemId);
      const itemStatus = openFinanceItemStatusSchema.safeParse(item.status);
      await this.syncRuns.updateConnectionItemSnapshot({
        connectionId: run.connectionId,
        itemStatus: itemStatus.success ? itemStatus.data : null,
        institutionName: item.connector.name,
        institutionLogoUrl: item.connector.imageUrl,
        lastSyncAttemptAt: seenAt
      });

      if (event === 'transactions/deleted') {
        await this.canonical.markTransactionsUnavailableByExternalIds(
          run.connectionId,
          run.accountExternalId,
          run.transactionIds
        );
        await this.syncRuns.markProductResult({
          connectionId: run.connectionId,
          product: 'TRANSACTIONS',
          status: 'SUCCESS',
          succeededAt: seenAt
        });
        await this.syncRuns.aggregateConnectionAfterRun(run.connectionId, new Date());
        return 'SUCCESS';
      }

      const syncEntities = event.startsWith('item/') || !event || run.trigger !== 'WEBHOOK';
      const syncTransactions =
        run.trigger !== 'WEBHOOK' ||
        event.startsWith('transactions/') ||
        event === '';

      if (syncEntities && !event.startsWith('transactions/')) {
        const accountsOk = await this.syncAccountsAndBills(run, seenAt);
        if (!accountsOk) {
          productFailures.push('ACCOUNTS');
        }

        const investmentsOk = await this.syncInvestments(run, item.connector.name, seenAt);
        if (!investmentsOk) {
          productFailures.push('INVESTMENTS');
        }
      }

      if (syncTransactions) {
        const transactionsOk = await this.syncTransactions(run, seenAt, event);
        if (!transactionsOk) {
          productFailures.push('TRANSACTIONS');
        } else {
          await this.canonical.applyTransferMatches(run.connectionId);
          await this.canonical.applyCardPaymentMatches(run.connectionId);
        }
      }

      await this.syncRuns.aggregateConnectionAfterRun(run.connectionId, new Date());

      if (productFailures.length === 0) {
        return 'SUCCESS';
      }

      return productFailures.length >= 3 ? 'FAILED' : 'PARTIAL';
    } catch (error) {
      this.logger.warn(`Sync run ${run.id} failed`);
      throw error;
    }
  }

  private async syncAccountsAndBills(run: ClaimedSyncRun, seenAt: Date): Promise<boolean> {
    try {
      const accounts = await this.pluggyClient.fetchAccounts(run.itemId);
      const mapped = accounts.map((account) => mapPluggyAccount(account));
      await this.canonical.upsertAccounts(run.connectionId, run.userId, mapped, seenAt);
      await this.canonical.markUnseenAccountsUnavailable(run.connectionId, seenAt);
      await this.syncRuns.markProductResult({
        connectionId: run.connectionId,
        product: 'ACCOUNTS',
        status: 'SUCCESS',
        succeededAt: seenAt
      });

      try {
        for (const account of accounts.filter((item) => item.type === 'CREDIT')) {
          const bills = await this.fetchAllBills(account.id);
          await this.canonical.upsertBills(
            account.id,
            run.connectionId,
            bills.map((bill) => mapPluggyBill(bill)),
            seenAt
          );
        }
        await this.canonical.markUnseenBillsUnavailable(run.connectionId, seenAt);
        await this.syncRuns.markProductResult({
          connectionId: run.connectionId,
          product: 'CREDIT_CARDS',
          status: 'SUCCESS',
          succeededAt: seenAt
        });
      } catch {
        await this.syncRuns.markProductResult({
          connectionId: run.connectionId,
          product: 'CREDIT_CARDS',
          status: 'FAILED',
          error: providerError
        });
      }

      return true;
    } catch {
      await this.syncRuns.markProductResult({
        connectionId: run.connectionId,
        product: 'ACCOUNTS',
        status: 'FAILED',
        error: providerError
      });
      return false;
    }
  }

  private async syncTransactions(
    run: ClaimedSyncRun,
    seenAt: Date,
    event: string
  ): Promise<boolean> {
    try {
      if (event === 'transactions/created' && run.createdTransactionsLink) {
        const created = await this.pluggyClient.fetchTransactionsFromLink(run.createdTransactionsLink);
        await this.canonical.upsertTransactions(
          run.connectionId,
          run.userId,
          created.map((transaction) => mapPluggyTransaction(transaction)),
          seenAt
        );
      } else if (event === 'transactions/updated' && run.transactionIds.length > 0) {
        const accountId = run.accountExternalId;
        if (!accountId) {
          throw new InvalidArgumentError({
            code: 'open_finance.provider_unavailable',
            i18nKey: 'errors.open_finance.provider_unavailable'
          });
        }

        for (let index = 0; index < run.transactionIds.length; index += 500) {
          const batch = run.transactionIds.slice(index, index + 500);
          const updated = await this.pluggyClient.fetchTransactionsByIds(accountId, batch);
          await this.canonical.upsertTransactions(
            run.connectionId,
            run.userId,
            updated.map((transaction) => mapPluggyTransaction(transaction)),
            seenAt
          );
        }
      } else if (event === 'transactions/created' && run.accountExternalId) {
        const created = await this.pluggyClient.fetchAllTransactions(run.accountExternalId);
        await this.canonical.upsertTransactions(
          run.connectionId,
          run.userId,
          created.map((transaction) => mapPluggyTransaction(transaction)),
          seenAt
        );
      } else {
        const accounts = await this.pluggyClient.fetchAccounts(run.itemId);
        for (const account of accounts) {
          const pageTransactions = await this.pluggyClient.fetchAllTransactions(account.id);
          await this.canonical.upsertTransactions(
            run.connectionId,
            run.userId,
            pageTransactions.map((transaction) => mapPluggyTransaction(transaction)),
            seenAt
          );
        }
        await this.canonical.markUnseenTransactionsUnavailable(run.connectionId, seenAt);
      }

      await this.syncRuns.markProductResult({
        connectionId: run.connectionId,
        product: 'TRANSACTIONS',
        status: 'SUCCESS',
        succeededAt: seenAt
      });
      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Transaction sync failed: ${message}`);
      await this.syncRuns.markProductResult({
        connectionId: run.connectionId,
        product: 'TRANSACTIONS',
        status: 'FAILED',
        error: providerError
      });
      return false;
    }
  }

  private async syncInvestments(
    run: ClaimedSyncRun,
    institutionName: string,
    seenAt: Date
  ): Promise<boolean> {
    try {
      const investments = await this.fetchAllInvestments(run.itemId);
      await this.canonical.upsertInvestments(
        run.connectionId,
        investments.map((investment) => mapPluggyInvestment(investment, institutionName)),
        seenAt
      );
      await this.canonical.markUnseenInvestmentsUnavailable(run.connectionId, seenAt);
      await this.syncRuns.markProductResult({
        connectionId: run.connectionId,
        product: 'INVESTMENTS',
        status: 'SUCCESS',
        succeededAt: seenAt
      });

      try {
        for (const investment of investments) {
          const txs = await this.fetchAllInvestmentTransactions(investment.id);
          await this.canonical.upsertInvestmentTransactions(
            run.connectionId,
            investment.id,
            txs.map((transaction) => mapPluggyInvestmentTransaction(transaction)),
            seenAt
          );
        }
        await this.syncRuns.markProductResult({
          connectionId: run.connectionId,
          product: 'INVESTMENTS_TRANSACTIONS',
          status: 'SUCCESS',
          succeededAt: seenAt
        });
      } catch {
        await this.syncRuns.markProductResult({
          connectionId: run.connectionId,
          product: 'INVESTMENTS_TRANSACTIONS',
          status: 'FAILED',
          error: providerError
        });
      }

      return true;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`Investment sync failed: ${message}`);
      await this.syncRuns.markProductResult({
        connectionId: run.connectionId,
        product: 'INVESTMENTS',
        status: 'FAILED',
        error: providerError
      });
      return false;
    }
  }

  private async fetchAllBills(accountId: string) {
    const results: CreditCardBills[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await this.pluggyClient.fetchCreditCardBills({
        accountId,
        page,
        pageSize: 500
      });
      results.push(...response.results);
      totalPages = Math.max(response.totalPages, 1);
      page += 1;
    }

    return results;
  }

  private async fetchAllInvestments(itemId: string) {
    const results: Investment[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await this.pluggyClient.fetchInvestmentsPage({
        itemId,
        page,
        pageSize: 500
      });
      results.push(...response.results);
      totalPages = Math.max(response.totalPages, 1);
      page += 1;
    }

    return results;
  }

  private async fetchAllInvestmentTransactions(investmentId: string) {
    const results: InvestmentTransaction[] = [];
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const response = await this.pluggyClient.fetchInvestmentTransactionsPage({
        investmentId,
        page,
        pageSize: 500
      });
      results.push(...response.results);
      totalPages = Math.max(response.totalPages, 1);
      page += 1;
    }

    return results;
  }

  private assertEnabled(): void {
    if (!this.configService.get('OPEN_FINANCE_ENABLED')) {
      throw new NotFoundError({
        code: 'open_finance.disabled',
        i18nKey: 'errors.open_finance.disabled'
      });
    }
  }
}

export type { OpenFinanceSyncTrigger };

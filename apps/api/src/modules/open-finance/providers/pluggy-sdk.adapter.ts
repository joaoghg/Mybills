import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PluggyClient, type Investment, type Transaction } from 'pluggy-sdk';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { Env } from 'src/config/env.validation';
import {
  FetchBillsParams,
  FetchInvestmentTransactionsParams,
  FetchInvestmentsParams,
  FetchTransactionsV2Params,
  PluggyClientPort,
  PluggyCursorPage,
  PluggyOffsetPage
} from './pluggy-client.port';
import {
  MAX_TRANSACTION_IDS_PER_REQUEST,
  PLUGGY_API_BASE_URL
} from './pluggy.constants';

const API_KEY_TTL_MS = 2 * 60 * 60 * 1000;
const API_KEY_REFRESH_BUFFER_MS = 5 * 60 * 1000;

type AuthResponse = {
  apiKey: string;
};

type CursorPageJson<T> = {
  results: T[];
  next: string | null;
};

@Injectable()
export class PluggySdkClientAdapter implements PluggyClientPort {
  private readonly logger = new Logger(PluggySdkClientAdapter.name);
  private sdk: PluggyClient | null = null;
  private restApiKey: string | null = null;
  private restApiKeyExpiresAt = 0;

  constructor(private readonly configService: ConfigService<Env>) {}

  async fetchItem(itemId: string) {
    return await this.getSdk().fetchItem(itemId);
  }

  async deleteItem(itemId: string): Promise<void> {
    await this.getSdk().deleteItem(itemId);
  }

  async fetchAccounts(itemId: string) {
    const page = await this.getSdk().fetchAccounts(itemId);
    return page.results;
  }

  async fetchAccount(accountId: string) {
    return await this.getSdk().fetchAccount(accountId);
  }

  async fetchCreditCardBills(params: FetchBillsParams) {
    const page = await this.getSdk().fetchCreditCardBills(params.accountId, {
      page: params.page,
      pageSize: params.pageSize ?? 500
    });

    return {
      results: page.results,
      page: page.page,
      total: page.total,
      totalPages: page.totalPages
    };
  }

  async fetchTransactionsPage(
    params: FetchTransactionsV2Params
  ): Promise<PluggyCursorPage<Transaction>> {
    const page = await this.getSdk().fetchTransactionsCursor(params.accountId, {
      after: params.after,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      createdAtFrom: params.createdAtFrom,
      ids: params.ids
    });

    return {
      results: page.results,
      next: page.next
    };
  }

  async fetchAllTransactions(accountId: string): Promise<Transaction[]> {
    const results: Transaction[] = [];
    let after: string | undefined;
    let hasMore = true;

    while (hasMore) {
      const page = await this.fetchTransactionsPage({
        accountId,
        after
      });
      results.push(...page.results);

      if (!page.next) {
        hasMore = false;
      } else {
        const afterMatch = page.next.match(/after=([^&]+)/);
        after = afterMatch?.[1] ? decodeURIComponent(afterMatch[1]) : undefined;
        hasMore = Boolean(after);
      }
    }

    return results;
  }

  async fetchTransactionsByIds(accountId: string, ids: string[]): Promise<Transaction[]> {
    if (ids.length === 0) {
      return [];
    }

    if (ids.length > MAX_TRANSACTION_IDS_PER_REQUEST) {
      throw new InvalidArgumentError({
        code: 'open_finance.transaction_ids_limit',
        i18nKey: 'errors.open_finance.transaction_ids_limit'
      });
    }

    const page = await this.fetchTransactionsPage({ accountId, ids });
    return page.results;
  }

  async fetchTransaction(transactionId: string): Promise<Transaction> {
    return await this.getSdk().fetchTransaction(transactionId);
  }

  async fetchTransactionsFromLink(createdTransactionsLink: string): Promise<Transaction[]> {
    const results: Transaction[] = [];
    let nextUrl: string | null = this.toAbsoluteUrl(createdTransactionsLink);

    while (nextUrl) {
      const page = await this.restGetJson<CursorPageJson<Transaction>>(nextUrl);
      results.push(...page.results);
      nextUrl = page.next ? this.toAbsoluteUrl(page.next) : null;
    }

    return results;
  }

  async fetchInvestmentsPage(
    params: FetchInvestmentsParams
  ): Promise<PluggyOffsetPage<Investment>> {
    const page = await this.getSdk().fetchInvestments(params.itemId, undefined, {
      page: params.page,
      pageSize: params.pageSize ?? 500
    });

    return {
      results: page.results,
      page: page.page,
      total: page.total,
      totalPages: page.totalPages
    };
  }

  async fetchInvestmentTransactionsPage(params: FetchInvestmentTransactionsParams) {
    const page = await this.getSdk().fetchInvestmentTransactions(params.investmentId, {
      page: params.page,
      pageSize: params.pageSize ?? 500
    });

    return {
      results: page.results,
      page: page.page,
      total: page.total,
      totalPages: page.totalPages
    };
  }

  private getSdk(): PluggyClient {
    if (this.sdk) {
      return this.sdk;
    }

    const clientId = this.configService.get('PLUGGY_CLIENT_ID', { infer: true });
    const clientSecret = this.configService.get('PLUGGY_CLIENT_SECRET', { infer: true });

    if (!clientId || !clientSecret) {
      throw new InvalidArgumentError({
        code: 'open_finance.not_configured',
        i18nKey: 'errors.open_finance.not_configured'
      });
    }

    this.sdk = new PluggyClient({ clientId, clientSecret });
    return this.sdk;
  }

  private toAbsoluteUrl(pathOrUrl: string): string {
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
      return pathOrUrl;
    }

    if (pathOrUrl.startsWith('/v2/transactions') || pathOrUrl.startsWith('?')) {
      const suffix = pathOrUrl.startsWith('?') ? `/v2/transactions${pathOrUrl}` : pathOrUrl;
      return `${PLUGGY_API_BASE_URL}${suffix}`;
    }

    return `${PLUGGY_API_BASE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
  }

  private async restGetJson<T>(url: string): Promise<T> {
    const apiKey = await this.getRestApiKey();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      this.logger.warn(`Pluggy REST request failed with status ${response.status}`);
      throw new InvalidArgumentError({
        code: 'open_finance.provider_unavailable',
        i18nKey: 'errors.open_finance.provider_unavailable'
      });
    }

    return (await response.json()) as T;
  }

  private async getRestApiKey(): Promise<string> {
    const now = Date.now();

    if (this.restApiKey && now < this.restApiKeyExpiresAt - API_KEY_REFRESH_BUFFER_MS) {
      return this.restApiKey;
    }

    const clientId = this.configService.get('PLUGGY_CLIENT_ID', { infer: true });
    const clientSecret = this.configService.get('PLUGGY_CLIENT_SECRET', { infer: true });

    if (!clientId || !clientSecret) {
      throw new InvalidArgumentError({
        code: 'open_finance.not_configured',
        i18nKey: 'errors.open_finance.not_configured'
      });
    }

    const response = await fetch(`${PLUGGY_API_BASE_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret })
    });

    if (!response.ok) {
      this.logger.warn('Failed to refresh Pluggy API key');
      throw new InvalidArgumentError({
        code: 'open_finance.not_configured',
        i18nKey: 'errors.open_finance.not_configured'
      });
    }

    const body = (await response.json()) as AuthResponse;
    this.restApiKey = body.apiKey;
    this.restApiKeyExpiresAt = now + API_KEY_TTL_MS;
    return this.restApiKey;
  }
}

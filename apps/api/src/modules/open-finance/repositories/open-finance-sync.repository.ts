import {
  OpenFinanceConnectionOutput,
  OpenFinanceProductType,
  OpenFinanceSyncRunOutput,
  OpenFinanceSyncTrigger
} from '@mybills/dtos';

export type EnqueueSyncInput = {
  connectionId: string;
  trigger: OpenFinanceSyncTrigger;
  webhookEventId?: string | null;
  createdTransactionsLink?: string | null;
  transactionIds?: string[];
  accountExternalId?: string | null;
};

export type ClaimedSyncRun = {
  id: string;
  connectionId: string;
  itemId: string;
  userId: string;
  trigger: OpenFinanceSyncTrigger;
  attemptCount: number;
  webhookEventId: string | null;
  webhookEvent: string | null;
  createdTransactionsLink: string | null;
  transactionIds: string[];
  accountExternalId: string | null;
};

export type PersistWebhookEventInput = {
  eventId: string;
  event: string;
  itemId: string | null;
  accountId: string | null;
  payloadMetadata: Record<string, unknown>;
};

export type PersistWebhookEventResult = {
  id: string;
  duplicate: boolean;
  itemId: string | null;
};

export interface OpenFinanceSyncRepository {
  enqueueOrCoalesce(input: EnqueueSyncInput): Promise<OpenFinanceSyncRunOutput>;
  recoverAbandonedRuns(now: Date): Promise<number>;
  claimNextRun(now: Date, leaseExpiresAt: Date): Promise<ClaimedSyncRun | null>;
  completeRun(
    runId: string,
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED',
    error?: { code: string; i18nKey: string } | null
  ): Promise<void>;
  failRunForRetry(runId: string, error: { code: string; i18nKey: string }): Promise<void>;
  markRunFailedPermanently(runId: string, error: { code: string; i18nKey: string }): Promise<void>;
  findStaleConnectionIds(staleBefore: Date): Promise<string[]>;
  persistWebhookEvent(input: PersistWebhookEventInput): Promise<PersistWebhookEventResult>;
  findActiveConnectionByItemId(itemId: string): Promise<OpenFinanceConnectionOutput | null>;
  updateConnectionItemSnapshot(input: {
    connectionId: string;
    itemStatus: OpenFinanceConnectionOutput['itemStatus'];
    institutionName: string | null;
    institutionLogoUrl: string | null;
    lastSyncAttemptAt: Date;
  }): Promise<void>;
  markProductResult(input: {
    connectionId: string;
    product: OpenFinanceProductType;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'UNSUPPORTED';
    error?: { code: string; i18nKey: string } | null;
    succeededAt?: Date | null;
  }): Promise<void>;
  aggregateConnectionAfterRun(connectionId: string, finishedAt: Date): Promise<void>;
}

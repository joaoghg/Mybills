import { Injectable } from '@nestjs/common';
import {
  OpenFinanceConnectionOutput,
  OpenFinanceProductType,
  OpenFinanceSyncRunOutput,
  openFinanceConnectionOutputSchema,
  openFinanceSyncRunOutputSchema
} from '@mybills/dtos';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import {
  ClaimedSyncRun,
  EnqueueSyncInput,
  OpenFinanceSyncRepository,
  PersistWebhookEventInput,
  PersistWebhookEventResult
} from '../open-finance-sync.repository';
import { SYNC_MAX_ATTEMPTS } from '../../open-finance.tokens';

@Injectable()
export class PrismaOpenFinanceSyncRepository implements OpenFinanceSyncRepository {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueOrCoalesce(input: EnqueueSyncInput): Promise<OpenFinanceSyncRunOutput> {
    const active = await this.prisma.openFinanceSyncRun.findFirst({
      where: {
        connectionId: input.connectionId,
        status: { in: ['PENDING', 'RUNNING'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (active) {
      if (active.status === 'PENDING') {
        const mergedIds = [...new Set([...active.transactionIds, ...(input.transactionIds ?? [])])];
        const updated = await this.prisma.openFinanceSyncRun.update({
          where: { id: active.id },
          data: {
            createdTransactionsLink: input.createdTransactionsLink ?? active.createdTransactionsLink,
            transactionIds: mergedIds,
            accountExternalId: input.accountExternalId ?? active.accountExternalId,
            webhookEventId: input.webhookEventId ?? active.webhookEventId
          }
        });
        return await this.mapRun(updated.id);
      }

      return await this.mapRun(active.id);
    }

    const created = await this.prisma.openFinanceSyncRun.create({
      data: {
        connectionId: input.connectionId,
        trigger: input.trigger,
        status: 'PENDING',
        webhookEventId: input.webhookEventId ?? null,
        createdTransactionsLink: input.createdTransactionsLink ?? null,
        transactionIds: input.transactionIds ?? [],
        accountExternalId: input.accountExternalId ?? null
      }
    });

    return await this.mapRun(created.id);
  }

  async recoverAbandonedRuns(now: Date): Promise<number> {
    const result = await this.prisma.openFinanceSyncRun.updateMany({
      where: {
        status: 'RUNNING',
        OR: [{ leaseExpiresAt: { lt: now } }, { leaseExpiresAt: null }]
      },
      data: {
        status: 'PENDING',
        leaseExpiresAt: null
      }
    });

    return result.count;
  }

  async claimNextRun(now: Date, leaseExpiresAt: Date): Promise<ClaimedSyncRun | null> {
    const pending = await this.prisma.openFinanceSyncRun.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        connection: true,
        webhookEvent: true
      }
    });

    if (!pending) {
      return null;
    }

    const claimed = await this.prisma.openFinanceSyncRun.updateMany({
      where: { id: pending.id, status: 'PENDING' },
      data: {
        status: 'RUNNING',
        leaseExpiresAt,
        startedAt: pending.startedAt ?? now,
        attemptCount: { increment: 1 }
      }
    });

    if (claimed.count === 0) {
      return null;
    }

    const run = await this.prisma.openFinanceSyncRun.findUniqueOrThrow({
      where: { id: pending.id },
      include: { connection: true, webhookEvent: true }
    });

    return {
      id: run.id,
      connectionId: run.connectionId,
      itemId: run.connection.itemId,
      userId: run.connection.userId,
      trigger: run.trigger,
      attemptCount: run.attemptCount,
      webhookEventId: run.webhookEventId,
      webhookEvent: run.webhookEvent?.event ?? null,
      createdTransactionsLink: run.createdTransactionsLink,
      transactionIds: run.transactionIds,
      accountExternalId: run.accountExternalId
    };
  }

  async completeRun(
    runId: string,
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED',
    error?: { code: string; i18nKey: string } | null
  ): Promise<void> {
    await this.prisma.openFinanceSyncRun.update({
      where: { id: runId },
      data: {
        status,
        finishedAt: new Date(),
        leaseExpiresAt: null,
        errorCode: error?.code ?? null,
        errorI18nKey: error?.i18nKey ?? null
      }
    });
  }

  async failRunForRetry(runId: string, error: { code: string; i18nKey: string }): Promise<void> {
    const run = await this.prisma.openFinanceSyncRun.findUniqueOrThrow({
      where: { id: runId }
    });

    if (run.attemptCount >= SYNC_MAX_ATTEMPTS) {
      await this.markRunFailedPermanently(runId, error);
      return;
    }

    await this.prisma.openFinanceSyncRun.update({
      where: { id: runId },
      data: {
        status: 'PENDING',
        leaseExpiresAt: null,
        errorCode: error.code,
        errorI18nKey: error.i18nKey
      }
    });
  }

  async markRunFailedPermanently(
    runId: string,
    error: { code: string; i18nKey: string }
  ): Promise<void> {
    await this.completeRun(runId, 'FAILED', error);
  }

  async findStaleConnectionIds(staleBefore: Date): Promise<string[]> {
    const connections = await this.prisma.openFinanceConnection.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ lastSuccessfulSyncAt: null }, { lastSuccessfulSyncAt: { lt: staleBefore } }],
        syncRuns: {
          none: { status: { in: ['PENDING', 'RUNNING'] } }
        }
      },
      select: { id: true }
    });

    return connections.map((connection) => connection.id);
  }

  async persistWebhookEvent(input: PersistWebhookEventInput): Promise<PersistWebhookEventResult> {
    try {
      const created = await this.prisma.openFinanceWebhookEvent.create({
        data: {
          eventId: input.eventId,
          event: input.event,
          itemId: input.itemId,
          accountId: input.accountId,
          payloadMetadata: input.payloadMetadata as Prisma.InputJsonValue
        }
      });

      return { id: created.id, duplicate: false, itemId: created.itemId };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.openFinanceWebhookEvent.findUniqueOrThrow({
          where: { eventId: input.eventId }
        });
        return { id: existing.id, duplicate: true, itemId: existing.itemId };
      }

      throw error;
    }
  }

  async findActiveConnectionByItemId(itemId: string): Promise<OpenFinanceConnectionOutput | null> {
    const connection = await this.prisma.openFinanceConnection.findFirst({
      where: { itemId, status: 'ACTIVE' },
      include: { productSyncState: true }
    });

    if (!connection) {
      return null;
    }

    return openFinanceConnectionOutputSchema.parse({
      id: connection.id,
      userId: connection.userId,
      itemId: connection.itemId,
      connectorId: connection.connectorId,
      status: connection.status,
      itemStatus: connection.itemStatus,
      institutionName: connection.institutionName,
      institutionLogoUrl: connection.institutionLogoUrl,
      products: connection.productSyncState.map((product) => ({
        product: product.product,
        status: product.status,
        lastSuccessfulSyncAt: product.lastSuccessfulSyncAt?.toISOString() ?? null,
        error: product.errorCode
          ? {
              code: product.errorCode,
              product: product.product,
              i18nKey: product.errorI18nKey ?? 'errors.open_finance.provider_unavailable'
            }
          : null
      })),
      lastSuccessfulSyncAt: connection.lastSuccessfulSyncAt?.toISOString() ?? null,
      lastSyncAttemptAt: connection.lastSyncAttemptAt?.toISOString() ?? null,
      error: connection.errorCode
        ? {
            code: connection.errorCode,
            product: null,
            i18nKey: connection.errorI18nKey ?? 'errors.open_finance.provider_unavailable'
          }
        : null,
      createdAt: connection.createdAt.toISOString(),
      updatedAt: connection.updatedAt.toISOString()
    });
  }

  async updateConnectionItemSnapshot(input: {
    connectionId: string;
    itemStatus: OpenFinanceConnectionOutput['itemStatus'];
    institutionName: string | null;
    institutionLogoUrl: string | null;
    lastSyncAttemptAt: Date;
  }): Promise<void> {
    await this.prisma.openFinanceConnection.update({
      where: { id: input.connectionId },
      data: {
        itemStatus: input.itemStatus,
        institutionName: input.institutionName,
        institutionLogoUrl: input.institutionLogoUrl,
        lastSyncAttemptAt: input.lastSyncAttemptAt
      }
    });
  }

  async markProductResult(input: {
    connectionId: string;
    product: OpenFinanceProductType;
    status: 'SUCCESS' | 'PARTIAL' | 'FAILED' | 'UNSUPPORTED';
    error?: { code: string; i18nKey: string } | null;
    succeededAt?: Date | null;
  }): Promise<void> {
    await this.prisma.openFinanceProductSyncState.upsert({
      where: {
        connectionId_product: {
          connectionId: input.connectionId,
          product: input.product
        }
      },
      create: {
        connectionId: input.connectionId,
        product: input.product,
        status: input.status,
        lastSuccessfulSyncAt: input.status === 'SUCCESS' ? (input.succeededAt ?? new Date()) : null,
        errorCode: input.error?.code ?? null,
        errorI18nKey: input.error?.i18nKey ?? null
      },
      update: {
        status: input.status,
        lastSuccessfulSyncAt:
          input.status === 'SUCCESS' ? (input.succeededAt ?? new Date()) : undefined,
        errorCode: input.error?.code ?? null,
        errorI18nKey: input.error?.i18nKey ?? null
      }
    });
  }

  async aggregateConnectionAfterRun(connectionId: string, finishedAt: Date): Promise<void> {
    const products = await this.prisma.openFinanceProductSyncState.findMany({
      where: { connectionId }
    });
    const failed = products.some((product) => product.status === 'FAILED');
    const success = products.some((product) => product.status === 'SUCCESS');
    const error = products.find((product) => product.errorCode);

    await this.prisma.openFinanceConnection.update({
      where: { id: connectionId },
      data: {
        lastSyncAttemptAt: finishedAt,
        lastSuccessfulSyncAt: success ? finishedAt : undefined,
        errorCode: failed ? (error?.errorCode ?? 'open_finance.provider_unavailable') : null,
        errorI18nKey: failed
          ? (error?.errorI18nKey ?? 'errors.open_finance.provider_unavailable')
          : null
      }
    });
  }

  private async mapRun(runId: string): Promise<OpenFinanceSyncRunOutput> {
    const run = await this.prisma.openFinanceSyncRun.findUniqueOrThrow({
      where: { id: runId },
      include: { connection: { include: { productSyncState: true } } }
    });

    return openFinanceSyncRunOutputSchema.parse({
      id: run.id,
      connectionId: run.connectionId,
      trigger: run.trigger,
      status: run.status,
      products: run.connection.productSyncState.map((product) => ({
        product: product.product,
        status: product.status,
        lastSuccessfulSyncAt: product.lastSuccessfulSyncAt?.toISOString() ?? null,
        error: product.errorCode
          ? {
              code: product.errorCode,
              product: product.product,
              i18nKey: product.errorI18nKey ?? 'errors.open_finance.provider_unavailable'
            }
          : null
      })),
      error: run.errorCode
        ? {
            code: run.errorCode,
            product: null,
            i18nKey: run.errorI18nKey ?? 'errors.open_finance.provider_unavailable'
          }
        : null,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString()
    });
  }
}

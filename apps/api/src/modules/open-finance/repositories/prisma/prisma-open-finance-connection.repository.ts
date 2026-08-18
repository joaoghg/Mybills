import { Injectable } from '@nestjs/common';
import {
  OpenFinanceConnectionOutput,
  OpenFinanceProductStateOutput,
  OpenFinanceSyncRunOutput,
  openFinanceConnectionOutputSchema,
  openFinanceSyncRunOutputSchema
} from '@mybills/dtos';
import {
  OpenFinanceConnection,
  OpenFinanceProductSyncState,
  OpenFinanceSyncRun
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import {
  CreateOpenFinanceConnectionRecord,
  OpenFinanceConnectionRepository
} from '../open-finance-connection.repository';

type ConnectionWithProducts = OpenFinanceConnection & {
  productSyncState: OpenFinanceProductSyncState[];
};

@Injectable()
export class PrismaOpenFinanceConnectionRepository implements OpenFinanceConnectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByItemId(itemId: string): Promise<OpenFinanceConnectionOutput | null> {
    const connection = await this.prisma.openFinanceConnection.findUnique({
      where: { itemId },
      include: { productSyncState: true }
    });

    return connection ? this.mapConnection(connection) : null;
  }

  async findByIdAndUserId(
    connectionId: string,
    userId: string
  ): Promise<OpenFinanceConnectionOutput | null> {
    const connection = await this.prisma.openFinanceConnection.findFirst({
      where: { id: connectionId, userId },
      include: { productSyncState: true }
    });

    return connection ? this.mapConnection(connection) : null;
  }

  async findAllByUserId(userId: string): Promise<OpenFinanceConnectionOutput[]> {
    const connections = await this.prisma.openFinanceConnection.findMany({
      where: { userId },
      include: { productSyncState: true },
      orderBy: { createdAt: 'desc' }
    });

    return connections.map((connection) => this.mapConnection(connection));
  }

  async create(data: CreateOpenFinanceConnectionRecord): Promise<OpenFinanceConnectionOutput> {
    const products = [
      'ACCOUNTS',
      'CREDIT_CARDS',
      'TRANSACTIONS',
      'INVESTMENTS',
      'INVESTMENTS_TRANSACTIONS'
    ] as const;

    const connection = await this.prisma.openFinanceConnection.create({
      data: {
        userId: data.userId,
        itemId: data.itemId,
        connectorId: data.connectorId,
        itemStatus: data.itemStatus,
        institutionName: data.institutionName,
        institutionLogoUrl: data.institutionLogoUrl,
        productSyncState: {
          create: products.map((product) => ({
            product,
            status: 'PENDING' as const
          }))
        }
      },
      include: { productSyncState: true }
    });

    return this.mapConnection(connection);
  }

  async disconnect(connectionId: string): Promise<OpenFinanceConnectionOutput> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.openFinanceConnection.update({
        where: { id: connectionId },
        data: {
          status: 'DISCONNECTED',
          disconnectedAt: now
        }
      });

      await tx.openFinanceAccount.updateMany({
        where: { connectionId, unavailableAt: null },
        data: { unavailableAt: now }
      });

      await tx.investment.updateMany({
        where: { connectionId, unavailableAt: null },
        data: { unavailableAt: now }
      });

      await tx.account.updateMany({
        where: {
          openFinanceAccount: { connectionId },
          hiddenAt: null
        },
        data: { hiddenAt: now }
      });

      await tx.creditCard.updateMany({
        where: {
          openFinanceAccount: { connectionId },
          hiddenAt: null
        },
        data: { hiddenAt: now }
      });

      await tx.transaction.updateMany({
        where: {
          openFinanceTransaction: { account: { connectionId } },
          hiddenAt: null
        },
        data: { hiddenAt: now }
      });
    });

    const connection = await this.prisma.openFinanceConnection.findUniqueOrThrow({
      where: { id: connectionId },
      include: { productSyncState: true }
    });

    return this.mapConnection(connection);
  }

  async findSyncRunByIdAndUserId(
    connectionId: string,
    syncRunId: string,
    userId: string
  ): Promise<OpenFinanceSyncRunOutput | null> {
    const run = await this.prisma.openFinanceSyncRun.findFirst({
      where: {
        id: syncRunId,
        connectionId,
        connection: { userId }
      }
    });

    if (!run) {
      return null;
    }

    const connection = await this.prisma.openFinanceConnection.findUniqueOrThrow({
      where: { id: connectionId },
      include: { productSyncState: true }
    });

    return this.mapSyncRun(run, connection.productSyncState);
  }

  private mapConnection(connection: ConnectionWithProducts): OpenFinanceConnectionOutput {
    return openFinanceConnectionOutputSchema.parse({
      id: connection.id,
      userId: connection.userId,
      itemId: connection.itemId,
      connectorId: connection.connectorId,
      status: connection.status,
      itemStatus: connection.itemStatus,
      institutionName: connection.institutionName,
      institutionLogoUrl: connection.institutionLogoUrl,
      products: connection.productSyncState.map((product) => this.mapProduct(product)),
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

  private mapProduct(product: OpenFinanceProductSyncState): OpenFinanceProductStateOutput {
    return {
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
    };
  }

  private mapSyncRun(
    run: OpenFinanceSyncRun,
    products: OpenFinanceProductSyncState[]
  ): OpenFinanceSyncRunOutput {
    return openFinanceSyncRunOutputSchema.parse({
      id: run.id,
      connectionId: run.connectionId,
      trigger: run.trigger,
      status: run.status,
      products: products.map((product) => this.mapProduct(product)),
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

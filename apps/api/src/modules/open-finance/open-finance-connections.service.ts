import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateOpenFinanceConnectionInput,
  OpenFinanceConnectionOutput,
  OpenFinanceItemStatus,
  OpenFinanceSyncRunOutput,
  openFinanceItemStatusSchema
} from '@mybills/dtos';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { Env } from 'src/config/env.validation';
import { MEU_PLUGGY_CONNECTOR_ID, PLUGGY_CLIENT_PORT } from './providers/pluggy.constants';
import { PluggyClientPort } from './providers/pluggy-client.port';
import { OpenFinanceConnectionRepository } from './repositories/open-finance-connection.repository';

@Injectable()
export class OpenFinanceConnectionsService {
  constructor(
    private readonly configService: ConfigService<Env>,
    @Inject(PLUGGY_CLIENT_PORT) private readonly pluggyClient: PluggyClientPort,
    @Inject('OpenFinanceConnectionRepository')
    private readonly connections: OpenFinanceConnectionRepository
  ) {}

  async register(
    userId: string,
    input: CreateOpenFinanceConnectionInput
  ): Promise<OpenFinanceConnectionOutput> {
    this.assertEnabled();
    this.validateUserId(userId);

    const existing = await this.connections.findByItemId(input.itemId);
    if (existing) {
      throw new AlreadyExistsError({
        code: 'open_finance.item_already_registered',
        i18nKey: 'errors.open_finance.item_already_registered'
      });
    }

    let item;

    try {
      item = await this.pluggyClient.fetchItem(input.itemId);
    } catch {
      throw new InvalidArgumentError({
        code: 'open_finance.item_unavailable',
        i18nKey: 'errors.open_finance.item_unavailable'
      });
    }

    if (item.connector.id !== MEU_PLUGGY_CONNECTOR_ID) {
      throw new InvalidArgumentError({
        code: 'open_finance.invalid_connector',
        i18nKey: 'errors.open_finance.invalid_connector'
      });
    }

    return await this.connections.create({
      userId,
      itemId: item.id,
      connectorId: item.connector.id,
      itemStatus: this.mapItemStatus(item.status),
      institutionName: item.connector.name,
      institutionLogoUrl: item.connector.imageUrl
    });
  }

  async list(userId: string): Promise<OpenFinanceConnectionOutput[]> {
    this.assertEnabled();
    this.validateUserId(userId);
    return await this.connections.findAllByUserId(userId);
  }

  async disconnect(connectionId: string, userId: string): Promise<void> {
    this.assertEnabled();
    this.validateUserId(userId);

    const connection = await this.requireOwnedConnection(connectionId, userId);

    if (connection.status === 'DISCONNECTED') {
      return;
    }

    try {
      await this.pluggyClient.deleteItem(connection.itemId);
    } catch {
      const stillExists = await this.itemStillExists(connection.itemId);
      if (stillExists) {
        throw new InvalidArgumentError({
          code: 'open_finance.disconnect_failed',
          i18nKey: 'errors.open_finance.disconnect_failed'
        });
      }
    }

    await this.connections.disconnect(connection.id);
  }

  async getSyncRun(
    connectionId: string,
    syncRunId: string,
    userId: string
  ): Promise<OpenFinanceSyncRunOutput> {
    this.assertEnabled();
    this.validateUserId(userId);
    await this.requireOwnedConnection(connectionId, userId);

    const run = await this.connections.findSyncRunByIdAndUserId(connectionId, syncRunId, userId);
    if (!run) {
      throw new NotFoundError({
        code: 'open_finance.sync_run_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'sync_run' }
      });
    }

    return run;
  }

  private async requireOwnedConnection(
    connectionId: string,
    userId: string
  ): Promise<OpenFinanceConnectionOutput> {
    const connection = await this.connections.findByIdAndUserId(connectionId, userId);
    if (!connection) {
      throw new NotFoundError({
        code: 'open_finance.connection_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'connection' }
      });
    }

    return connection;
  }

  private async itemStillExists(itemId: string): Promise<boolean> {
    try {
      await this.pluggyClient.fetchItem(itemId);
      return true;
    } catch {
      return false;
    }
  }

  private mapItemStatus(status: string): OpenFinanceItemStatus | null {
    const parsed = openFinanceItemStatusSchema.safeParse(status);
    return parsed.success ? parsed.data : null;
  }

  private assertEnabled(): void {
    if (!this.configService.get('OPEN_FINANCE_ENABLED')) {
      throw new NotFoundError({
        code: 'open_finance.disabled',
        i18nKey: 'errors.open_finance.disabled'
      });
    }
  }

  private validateUserId(userId: string): void {
    if (!userId) {
      throw new InvalidArgumentError({
        code: 'open_finance.invalid_user',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_id' }
      });
    }
  }
}

import { timingSafeEqual, createHash } from 'crypto';
import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { UnauthorizedError } from 'src/common/errors/unauthorized.error';
import { Env } from 'src/config/env.validation';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { WEBHOOK_SECRET_HEADER } from './open-finance.tokens';
import { OPEN_FINANCE_SYNC_REPOSITORY } from './open-finance.tokens';
import { Inject } from '@nestjs/common';
import { OpenFinanceSyncRepository } from './repositories/open-finance-sync.repository';

type PluggyWebhookBody = {
  eventId?: string;
  event?: string;
  itemId?: string;
  accountId?: string;
  transactionIds?: string[];
  createdTransactionsLink?: string;
  transactionsCreatedAtFrom?: string;
};

@Controller('open-finance/webhooks/pluggy')
@ApiExcludeController()
export class OpenFinanceWebhookController {
  constructor(
    private readonly configService: ConfigService<Env>,
    private readonly syncService: OpenFinanceSyncService,
    @Inject(OPEN_FINANCE_SYNC_REPOSITORY)
    private readonly syncRuns: OpenFinanceSyncRepository
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handle(
    @Headers(WEBHOOK_SECRET_HEADER) secretHeader: string | undefined,
    @Headers('x-pluggy-webhook-secret') altSecret: string | undefined,
    @Body() body: PluggyWebhookBody
  ): Promise<{ received: true }> {
    if (!this.configService.get('OPEN_FINANCE_ENABLED')) {
      throw new NotFoundError({
        code: 'open_finance.disabled',
        i18nKey: 'errors.open_finance.disabled'
      });
    }

    const expected = this.configService.get('PLUGGY_WEBHOOK_SECRET', { infer: true }) ?? '';
    const provided = secretHeader ?? altSecret ?? '';

    if (!this.secretsMatch(provided, expected)) {
      throw new UnauthorizedError({
        code: 'open_finance.invalid_webhook_secret',
        i18nKey: 'errors.open_finance.invalid_webhook_secret'
      });
    }

    const eventId = body.eventId;
    const event = body.event;
    if (!eventId || !event) {
      return { received: true };
    }

    const persisted = await this.syncRuns.persistWebhookEvent({
      eventId,
      event,
      itemId: body.itemId ?? null,
      accountId: body.accountId ?? null,
      payloadMetadata: {
        event,
        hasCreatedLink: Boolean(body.createdTransactionsLink),
        transactionIdsCount: body.transactionIds?.length ?? 0
      }
    });

    if (persisted.duplicate) {
      return { received: true };
    }

    const itemId = body.itemId ?? persisted.itemId;
    if (!itemId) {
      return { received: true };
    }

    const connection = await this.syncRuns.findActiveConnectionByItemId(itemId);
    if (!connection) {
      return { received: true };
    }

    await this.syncService.enqueue({
      connectionId: connection.id,
      trigger: 'WEBHOOK',
      webhookEventId: persisted.id,
      createdTransactionsLink: body.createdTransactionsLink ?? null,
      transactionIds: (body.transactionIds ?? []).slice(0, 500),
      accountExternalId: body.accountId ?? null
    });

    return { received: true };
  }

  private secretsMatch(provided: string, expected: string): boolean {
    const providedHash = createHash('sha256').update(provided).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    return timingSafeEqual(providedHash, expectedHash);
  }
}

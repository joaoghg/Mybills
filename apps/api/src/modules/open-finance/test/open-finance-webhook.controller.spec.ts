import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedError } from 'src/common/errors/unauthorized.error';
import { OpenFinanceSyncService } from '../open-finance-sync.service';
import { OpenFinanceWebhookController } from '../open-finance-webhook.controller';
import { OPEN_FINANCE_SYNC_REPOSITORY } from '../open-finance.tokens';
import { OpenFinanceSyncRepository } from '../repositories/open-finance-sync.repository';

describe('OpenFinanceWebhookController', () => {
  let controller: OpenFinanceWebhookController;
  let syncRuns: jest.Mocked<Pick<OpenFinanceSyncRepository, 'persistWebhookEvent' | 'findActiveConnectionByItemId'>>;
  let syncService: { enqueue: jest.Mock };

  beforeEach(async () => {
    syncService = { enqueue: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpenFinanceWebhookController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'OPEN_FINANCE_ENABLED') return true;
              if (key === 'PLUGGY_WEBHOOK_SECRET') return 'super-secret-webhook';
              return undefined;
            }
          }
        },
        { provide: OpenFinanceSyncService, useValue: syncService },
        {
          provide: OPEN_FINANCE_SYNC_REPOSITORY,
          useValue: {
            persistWebhookEvent: jest.fn(),
            findActiveConnectionByItemId: jest.fn()
          }
        }
      ]
    }).compile();

    controller = module.get(OpenFinanceWebhookController);
    syncRuns = module.get(OPEN_FINANCE_SYNC_REPOSITORY);
  });

  it('rejects invalid webhook secrets', async () => {
    await expect(
      controller.handle('wrong-secret', undefined, { eventId: 'e1', event: 'item/updated' })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('is idempotent for duplicate event ids', async () => {
    syncRuns.persistWebhookEvent.mockResolvedValue({
      id: 'wh-1',
      duplicate: true,
      itemId: 'item-1'
    });

    const result = await controller.handle('super-secret-webhook', undefined, {
      eventId: 'evt-1',
      event: 'item/updated',
      itemId: 'item-1'
    });

    expect(result).toEqual({ received: true });
    expect(syncService.enqueue).not.toHaveBeenCalled();
  });

  it('enqueues a targeted transaction run', async () => {
    syncRuns.persistWebhookEvent.mockResolvedValue({
      id: 'wh-2',
      duplicate: false,
      itemId: 'item-1'
    });
    syncRuns.findActiveConnectionByItemId.mockResolvedValue({
      id: 'conn-1'
    } as never);

    await controller.handle('super-secret-webhook', undefined, {
      eventId: 'evt-2',
      event: 'transactions/updated',
      itemId: 'item-1',
      accountId: 'acc-1',
      transactionIds: ['t1']
    });

    expect(syncService.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        trigger: 'WEBHOOK',
        transactionIds: ['t1']
      })
    );
  });
});

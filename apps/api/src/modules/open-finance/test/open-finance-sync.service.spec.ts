import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenFinanceSyncService } from '../open-finance-sync.service';
import { OPEN_FINANCE_CANONICAL_REPOSITORY, OPEN_FINANCE_SYNC_REPOSITORY } from '../open-finance.tokens';
import { PLUGGY_CLIENT_PORT } from '../providers/pluggy.constants';

describe('OpenFinanceSyncService coalescing', () => {
  it('returns the coalesced run from the repository', async () => {
    const enqueueOrCoalesce = jest.fn().mockResolvedValue({
      id: 'run-1',
      status: 'PENDING'
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenFinanceSyncService,
        {
          provide: ConfigService,
          useValue: { get: () => true }
        },
        { provide: PLUGGY_CLIENT_PORT, useValue: {} },
        {
          provide: 'OpenFinanceConnectionRepository',
          useValue: {
            findByIdAndUserId: jest.fn().mockResolvedValue({
              id: 'conn-1',
              status: 'ACTIVE'
            })
          }
        },
        {
          provide: OPEN_FINANCE_SYNC_REPOSITORY,
          useValue: { enqueueOrCoalesce }
        },
        { provide: OPEN_FINANCE_CANONICAL_REPOSITORY, useValue: {} }
      ]
    }).compile();

    const service = module.get(OpenFinanceSyncService);
    const first = await service.enqueueManual('conn-1', 'user-1');
    const second = await service.enqueueManual('conn-1', 'user-1');

    expect(first.id).toBe('run-1');
    expect(second.id).toBe('run-1');
    expect(enqueueOrCoalesce).toHaveBeenCalledTimes(2);
  });
});

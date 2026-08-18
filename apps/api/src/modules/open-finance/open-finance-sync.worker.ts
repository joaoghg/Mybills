import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, Interval } from '@nestjs/schedule';
import { Env } from 'src/config/env.validation';
import { OPEN_FINANCE_SYNC_REPOSITORY, SYNC_LEASE_MS } from './open-finance.tokens';
import { OpenFinanceSyncService } from './open-finance-sync.service';
import { OpenFinanceSyncRepository } from './repositories/open-finance-sync.repository';

@Injectable()
export class OpenFinanceSyncWorker {
  private readonly logger = new Logger(OpenFinanceSyncWorker.name);
  private running = false;

  constructor(
    private readonly configService: ConfigService<Env>,
    private readonly syncService: OpenFinanceSyncService,
    @Inject(OPEN_FINANCE_SYNC_REPOSITORY)
    private readonly syncRuns: OpenFinanceSyncRepository
  ) {}

  @Interval(5000)
  async tick(): Promise<void> {
    if (!this.configService.get('OPEN_FINANCE_ENABLED') || this.running) {
      return;
    }

    this.running = true;
    try {
      await this.syncRuns.recoverAbandonedRuns(new Date());
      const claimed = await this.syncRuns.claimNextRun(
        new Date(),
        new Date(Date.now() + SYNC_LEASE_MS)
      );

      if (!claimed) {
        return;
      }

      try {
        const status = await this.syncService.executeClaimedRun(claimed);
        await this.syncRuns.completeRun(claimed.id, status);
      } catch {
        await this.syncRuns.failRunForRetry(claimed.id, {
          code: 'open_finance.provider_unavailable',
          i18nKey: 'errors.open_finance.provider_unavailable'
        });
      }
    } catch (error) {
      this.logger.warn('Open Finance worker tick failed');
    } finally {
      this.running = false;
    }
  }

  @Cron('0 * * * *')
  async enqueueStale(): Promise<void> {
    await this.syncService.enqueueStaleRuns();
  }
}

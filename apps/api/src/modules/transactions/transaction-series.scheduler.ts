import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TransactionSeriesMaintenanceService } from './transaction-series-maintenance.service';

@Injectable()
export class TransactionSeriesScheduler implements OnModuleInit {
  private readonly logger = new Logger(TransactionSeriesScheduler.name);
  private running = false;

  constructor(private readonly maintenance: TransactionSeriesMaintenanceService) {}

  async onModuleInit(): Promise<void> {
    await this.safeRun('bootstrap');
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: 'UTC' })
  async handleDaily(): Promise<void> {
    await this.safeRun('daily');
  }

  private async safeRun(reason: string): Promise<void> {
    if (this.running) {
      this.logger.warn(`Skip series maintenance (${reason}): already running`);
      return;
    }

    this.running = true;
    try {
      const result = await this.maintenance.runMaintenance();
      this.logger.log(
        `Series maintenance (${reason}): activated=${result.activated} appended=${result.appended}`
      );
    } catch (error) {
      this.logger.error(`Series maintenance failed (${reason})`, error instanceof Error ? error.stack : error);
    } finally {
      this.running = false;
    }
  }
}

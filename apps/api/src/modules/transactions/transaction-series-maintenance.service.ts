import { Inject, Injectable } from '@nestjs/common';
import { TransactionSeriesType } from 'src/generated/prisma/client';
import {
  addMonthsPreserveDay,
  compareYmd,
  countOccurrencesUntilHorizon,
  generateRecurringOccurrences,
  horizonEndYmd,
  RECURRING_HORIZON_MONTHS,
  utcTodayYmd
} from './lib/monthly-schedule';
import { TransactionRepository } from './repositories/transaction.repository';

@Injectable()
export class TransactionSeriesMaintenanceService {
  constructor(
    @Inject('TransactionRepository') private readonly repository: TransactionRepository
  ) {}

  async runMaintenance(now: Date = new Date()): Promise<{
    activated: number;
    appended: number;
  }> {
    const todayYmd = utcTodayYmd(now);
    const activated = await this.repository.activateDueProjected(todayYmd);
    const appended = await this.extendActiveRecurringSeries(todayYmd);
    return { activated, appended };
  }

  async extendActiveRecurringSeries(todayYmd: string): Promise<number> {
    const horizonEnd = horizonEndYmd(todayYmd, RECURRING_HORIZON_MONTHS);
    let appended = 0;
    const batch = await this.repository.findActiveRecurringSeries(500);

    for (const series of batch) {
      if (series.type !== TransactionSeriesType.RECURRING || !series.isActive) {
        continue;
      }

      const count = countOccurrencesUntilHorizon(
        series.anchorDate,
        series.anchorDay,
        series.nextOccurrenceNumber,
        horizonEnd
      );

      if (count <= 0) {
        continue;
      }

      const drafts = generateRecurringOccurrences(
        series.anchorDate,
        count,
        series.nextOccurrenceNumber,
        series.anchorDay
      );

      const occurrences = drafts.map((draft) => ({
        occurrenceNumber: draft.occurrenceNumber,
        date: draft.date,
        isPaid: false,
        isProjected: compareYmd(draft.date, todayYmd) > 0
      }));

      const nextNumber =
        (occurrences[occurrences.length - 1]?.occurrenceNumber ?? series.nextOccurrenceNumber - 1) +
        1;

      appended += await this.repository.appendSeriesOccurrences(
        series.id,
        occurrences,
        nextNumber
      );
    }

    return appended;
  }

  buildInitialRecurringOccurrences(
    startYmd: string,
    anchorDay: number,
    firstIsPaid: boolean,
    now: Date = new Date()
  ) {
    const todayYmd = utcTodayYmd(now);
    const horizonEnd = horizonEndYmd(todayYmd, RECURRING_HORIZON_MONTHS);
    const endFromStart = addMonthsPreserveDay(startYmd, RECURRING_HORIZON_MONTHS - 1, anchorDay);
    const effectiveHorizon = compareYmd(endFromStart, horizonEnd) >= 0 ? endFromStart : horizonEnd;

    const count = countOccurrencesUntilHorizon(startYmd, anchorDay, 1, effectiveHorizon);
    const drafts = generateRecurringOccurrences(startYmd, Math.max(count, 1), 1, anchorDay);

    return drafts.map((draft, index) => ({
      occurrenceNumber: draft.occurrenceNumber,
      date: draft.date,
      isPaid: index === 0 ? firstIsPaid : false,
      isProjected: compareYmd(draft.date, todayYmd) > 0
    }));
  }
}

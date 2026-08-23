import { LAST_DAY_CLOSING_DAY } from '@mybills/utils';
import { deriveImportedCardCycleDays } from '../lib/imported-card-cycle-days';

describe('deriveImportedCardCycleDays', () => {
  it('should set closingDay 4 and not last-day when close date is null and bills all close on day 4', () => {
    const derived = deriveImportedCardCycleDays({
      accountClosingDate: null,
      accountDueDate: new Date(Date.UTC(2026, 7, 11)),
      billClosingDates: [
        new Date(Date.UTC(2026, 5, 4)),
        new Date(Date.UTC(2026, 6, 4)),
        new Date(Date.UTC(2026, 7, 4))
      ],
      billDueDates: [new Date(Date.UTC(2026, 5, 11)), new Date(Date.UTC(2026, 6, 11))]
    });

    expect(derived.closingDay).toBe(4);
    expect(derived.closingOnLastDay).toBe(false);
    expect(derived.dueDay).toBe(11);
  });

  it('should set last-day closing when close date is null and bills close on month end', () => {
    const derived = deriveImportedCardCycleDays({
      accountClosingDate: null,
      accountDueDate: new Date(Date.UTC(2026, 7, 12)),
      billClosingDates: [
        new Date(Date.UTC(2026, 4, 31)),
        new Date(Date.UTC(2026, 5, 30)),
        new Date(Date.UTC(2026, 6, 31))
      ],
      billDueDates: [new Date(Date.UTC(2026, 5, 12)), new Date(Date.UTC(2026, 6, 12))]
    });

    expect(derived.closingOnLastDay).toBe(true);
    expect(derived.closingDay).toBe(LAST_DAY_CLOSING_DAY);
    expect(derived.dueDay).toBe(12);
  });

  it('should set dueDay 12 from balanceDueDate even without bill history', () => {
    const derived = deriveImportedCardCycleDays({
      accountClosingDate: null,
      accountDueDate: new Date(Date.UTC(2026, 7, 12)),
      billClosingDates: [],
      billDueDates: []
    });

    expect(derived.dueDay).toBe(12);
    expect(derived.closingDay).toBeNull();
    expect(derived.closingOnLastDay).toBeNull();
  });
});

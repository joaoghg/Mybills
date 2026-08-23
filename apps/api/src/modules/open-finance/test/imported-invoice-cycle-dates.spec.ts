import {
  importedCycleDatesForAnchor,
  importedCycleDatesFromBill
} from '../lib/imported-invoice-cycle-dates';

describe('imported invoice cycle dates', () => {
  it('should persist Nubank billed bounds as 2026-07-04 / 2026-08-04 / 2026-08-11', () => {
    const dates = importedCycleDatesFromBill(
      { closingDay: 4, closingOnLastDay: false, dueDay: 11 },
      {
        closingOn: new Date(Date.UTC(2026, 7, 4)),
        dueOn: new Date(Date.UTC(2026, 7, 11))
      }
    );

    expect(dates.startsOn).toEqual(new Date(Date.UTC(2026, 6, 4)));
    expect(dates.endsOn).toEqual(new Date(Date.UTC(2026, 7, 4)));
    expect(dates.dueOn).toEqual(new Date(Date.UTC(2026, 7, 11)));
  });

  it('should set Bradesco unbilled dueOn to 2026-09-12 on 2026-08-19', () => {
    const dates = importedCycleDatesForAnchor(
      { closingDay: 31, closingOnLastDay: true, dueDay: 12 },
      new Date(Date.UTC(2026, 7, 19))
    );

    expect(dates.startsOn).toEqual(new Date(Date.UTC(2026, 6, 31)));
    expect(dates.endsOn).toEqual(new Date(Date.UTC(2026, 7, 31)));
    expect(dates.dueOn).toEqual(new Date(Date.UTC(2026, 8, 12)));
  });

  it('should snap a last-day billed cycle closing 2026-07-30 to endsOn 2026-07-31', () => {
    const dates = importedCycleDatesFromBill(
      { closingDay: 31, closingOnLastDay: true, dueDay: 12 },
      {
        closingOn: new Date(Date.UTC(2026, 6, 30)),
        dueOn: new Date(Date.UTC(2026, 7, 12))
      }
    );

    expect(dates.startsOn).toEqual(new Date(Date.UTC(2026, 5, 30)));
    expect(dates.endsOn).toEqual(new Date(Date.UTC(2026, 6, 31)));
    expect(dates.dueOn).toEqual(new Date(Date.UTC(2026, 7, 12)));
  });
});

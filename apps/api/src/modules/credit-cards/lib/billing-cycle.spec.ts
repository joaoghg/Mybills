import {
  formatYearMonth,
  getClosedBillingCycleRange,
  getCycleContainingDate,
  getInvoiceDueYmd,
  getInvoicePaymentMonth,
  inclusivePaymentMonthCount,
  resolveClosingDay
} from './billing-cycle';

describe('billing-cycle payment month helpers', () => {
  describe('resolveClosingDay', () => {
    it('should return stored closingDay when closingOnLastDay is false', () => {
      expect(resolveClosingDay({ closingDay: 10, closingOnLastDay: false })).toBe(10);
    });

    it('should return 31 when closingOnLastDay is true', () => {
      expect(resolveClosingDay({ closingDay: 10, closingOnLastDay: true })).toBe(31);
    });
  });

  describe('getCycleContainingDate', () => {
    it('should return Jul 4 to Aug 3 for purchase on Jul 21 with closing day 4', () => {
      expect(getCycleContainingDate(4, '2026-07-21')).toEqual({
        start: '2026-07-04',
        end: '2026-08-03'
      });
    });

    it('should start a new cycle on the closing day', () => {
      expect(getCycleContainingDate(4, '2026-08-04')).toEqual({
        start: '2026-08-04',
        end: '2026-09-03'
      });
    });

    it('should return Jun 30 to Jul 30 for purchase on Jul 15 with closing day 31', () => {
      expect(getCycleContainingDate(31, '2026-07-15')).toEqual({
        start: '2026-06-30',
        end: '2026-07-30'
      });
    });

    it('should clamp February closing to 28 in a non-leap year', () => {
      expect(getCycleContainingDate(31, '2026-02-15')).toEqual({
        start: '2026-01-31',
        end: '2026-02-27'
      });
    });

    it('should clamp February closing to 29 in a leap year', () => {
      expect(getCycleContainingDate(31, '2024-02-15')).toEqual({
        start: '2024-01-31',
        end: '2024-02-28'
      });
    });

    it('should clamp April closing to 30', () => {
      expect(getCycleContainingDate(31, '2026-04-15')).toEqual({
        start: '2026-03-31',
        end: '2026-04-29'
      });
    });

    it('should keep contiguous cycles across Jan to Mar with closing day 31', () => {
      expect(getCycleContainingDate(31, '2026-01-31')).toEqual({
        start: '2026-01-31',
        end: '2026-02-27'
      });
      expect(getCycleContainingDate(31, '2026-02-28')).toEqual({
        start: '2026-02-28',
        end: '2026-03-30'
      });
    });

    it('should roll December closing into January', () => {
      expect(getCycleContainingDate(31, '2025-12-31')).toEqual({
        start: '2025-12-31',
        end: '2026-01-30'
      });
    });
  });

  describe('getClosedBillingCycleRange', () => {
    it('should resolve February closed cycle ending the day before Feb 28', () => {
      expect(getClosedBillingCycleRange(31, '2026-02-27')).toEqual({
        start: '2026-01-31',
        end: '2026-02-27'
      });
    });

    it('should return null when cycleEnd is not aligned with closing day', () => {
      expect(getClosedBillingCycleRange(31, '2026-02-26')).toBeNull();
    });
  });

  describe('getInvoicePaymentMonth', () => {
    it('should map Jul 21 purchase with closing 4 and due 11 to August 2026', () => {
      expect(getInvoiceDueYmd(4, 11, '2026-07-21')).toBe('2026-08-11');
      expect(getInvoicePaymentMonth(4, 11, '2026-07-21')).toEqual({
        year: 2026,
        month: 8
      });
      expect(formatYearMonth(getInvoicePaymentMonth(4, 11, '2026-07-21'))).toBe('2026-08');
    });

    it('should map Jul purchase with closing 31 and due 12 to August 2026', () => {
      expect(getInvoiceDueYmd(31, 12, '2026-07-15')).toBe('2026-08-12');
      expect(getInvoicePaymentMonth(31, 12, '2026-07-15')).toEqual({
        year: 2026,
        month: 8
      });
    });

    it('should map February purchase with closing 31 and due 10 to March 2026', () => {
      expect(getInvoiceDueYmd(31, 10, '2026-02-15')).toBe('2026-03-10');
      expect(getInvoicePaymentMonth(31, 10, '2026-02-15')).toEqual({
        year: 2026,
        month: 3
      });
    });
  });

  describe('inclusivePaymentMonthCount', () => {
    it('should count 12 payment months from Aug 2026 to Jul 2027', () => {
      expect(
        inclusivePaymentMonthCount({ year: 2026, month: 8 }, { year: 2027, month: 7 })
      ).toBe(12);
    });
  });
});

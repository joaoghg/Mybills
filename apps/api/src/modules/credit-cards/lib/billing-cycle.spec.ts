import {
  formatYearMonth,
  getCycleContainingDate,
  getInvoiceDueYmd,
  getInvoicePaymentMonth,
  inclusivePaymentMonthCount
} from './billing-cycle';

describe('billing-cycle payment month helpers', () => {
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
  });

  describe('inclusivePaymentMonthCount', () => {
    it('should count 12 payment months from Aug 2026 to Jul 2027', () => {
      expect(
        inclusivePaymentMonthCount({ year: 2026, month: 8 }, { year: 2027, month: 7 })
      ).toBe(12);
    });
  });
});

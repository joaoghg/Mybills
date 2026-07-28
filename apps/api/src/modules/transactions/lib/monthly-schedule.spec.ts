import {
  addMonthsPreserveDay,
  compareYmd,
  generateInstallmentOccurrences,
  generateInstallmentOccurrencesByCount,
  generateRecurringOccurrences,
  inclusiveMonthCount,
  utcTodayYmd
} from './monthly-schedule';

describe('monthly-schedule', () => {
  describe('addMonthsPreserveDay', () => {
    it('preserves day across months', () => {
      expect(addMonthsPreserveDay('2026-01-15', 1, 15)).toBe('2026-02-15');
      expect(addMonthsPreserveDay('2026-01-15', 2, 15)).toBe('2026-03-15');
    });

    it('clamps end-of-month days', () => {
      expect(addMonthsPreserveDay('2026-01-31', 1, 31)).toBe('2026-02-28');
      expect(addMonthsPreserveDay('2024-01-31', 1, 31)).toBe('2024-02-29');
      expect(addMonthsPreserveDay('2026-01-31', 2, 31)).toBe('2026-03-31');
    });
  });

  describe('generateInstallmentOccurrences', () => {
    it('uses start and end dates with middle months clamped', () => {
      const occurrences = generateInstallmentOccurrences('2026-01-31', '2026-04-30');
      expect(occurrences).toEqual([
        { occurrenceNumber: 1, date: '2026-01-31' },
        { occurrenceNumber: 2, date: '2026-02-28' },
        { occurrenceNumber: 3, date: '2026-03-31' },
        { occurrenceNumber: 4, date: '2026-04-30' }
      ]);
    });

    it('requires at least two months', () => {
      expect(() => generateInstallmentOccurrences('2026-01-10', '2026-01-20')).toThrow();
    });

    it('counts months inclusively', () => {
      expect(inclusiveMonthCount('2026-01-15', '2026-04-15')).toBe(4);
    });
  });

  describe('generateInstallmentOccurrencesByCount', () => {
    it('should generate 12 months from Jul 21 ending Jun 21 next year', () => {
      const occurrences = generateInstallmentOccurrencesByCount('2026-07-21', 12);
      expect(occurrences).toHaveLength(12);
      expect(occurrences[0]).toEqual({ occurrenceNumber: 1, date: '2026-07-21' });
      expect(occurrences[11]).toEqual({ occurrenceNumber: 12, date: '2027-06-21' });
    });
  });

  describe('generateRecurringOccurrences', () => {
    it('builds horizon from anchor', () => {
      const occurrences = generateRecurringOccurrences('2026-01-10', 3, 1, 10);
      expect(occurrences.map((item) => item.date)).toEqual([
        '2026-01-10',
        '2026-02-10',
        '2026-03-10'
      ]);
    });

    it('continues from later occurrence numbers', () => {
      const occurrences = generateRecurringOccurrences('2026-01-10', 2, 12, 10);
      expect(occurrences).toEqual([
        { occurrenceNumber: 12, date: '2026-12-10' },
        { occurrenceNumber: 13, date: '2027-01-10' }
      ]);
    });
  });

  describe('compareYmd / utcTodayYmd', () => {
    it('compares dates lexicographically', () => {
      expect(compareYmd('2026-01-01', '2026-01-02')).toBe(-1);
      expect(compareYmd('2026-01-02', '2026-01-02')).toBe(0);
    });

    it('formats UTC today', () => {
      expect(utcTodayYmd(new Date(Date.UTC(2026, 6, 27)))).toBe('2026-07-27');
    });
  });
});

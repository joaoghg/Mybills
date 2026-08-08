import {
  canPayBillingCycle,
  getCycleContainingDate,
  getInvoiceDueYmd,
  resolveClosingDay
} from '@mybills/utils';
import { InvoiceStatus } from 'src/generated/prisma/client';
import {
  ensureInvoiceForCardDate,
  utcDateFromYmd,
  ymdFromUtcDate
} from './invoice-assignment';

describe('invoice-assignment helpers', () => {
  describe('ymd helpers', () => {
    it('should round-trip YMD through UTC dates', () => {
      const ymd = '2026-02-27';
      expect(ymdFromUtcDate(utcDateFromYmd(ymd))).toBe(ymd);
    });
  });

  describe('cycle status rules', () => {
    it('should treat cycle as payable after endsOn', () => {
      expect(canPayBillingCycle('2026-06-09', '2026-06-10')).toBe(true);
      expect(canPayBillingCycle('2026-06-09', '2026-06-09')).toBe(false);
    });

    it('should align due date with closing day for a purchase', () => {
      const closingDay = resolveClosingDay({ closingDay: 10, closingOnLastDay: false });
      const cycle = getCycleContainingDate(closingDay, '2026-05-15');
      expect(cycle).toEqual({ start: '2026-05-10', end: '2026-06-09' });
      expect(getInvoiceDueYmd(closingDay, 18, '2026-05-15')).toBe('2026-06-18');
    });
  });

  describe('ensureInvoiceForCardDate', () => {
    it('should create invoice when missing and return existing on second call', async () => {
      const created = {
        id: 'inv-1',
        startsOn: utcDateFromYmd('2026-05-10'),
        endsOn: utcDateFromYmd('2026-06-09'),
        dueOn: utcDateFromYmd('2026-06-18'),
        status: InvoiceStatus.CLOSED
      };

      const tx = {
        invoice: {
          findUnique: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(created),
          create: jest.fn().mockResolvedValue(created),
          update: jest.fn()
        }
      };

      const card = {
        id: 'card-1',
        userId: 'user-1',
        closingDay: 10,
        closingOnLastDay: false,
        dueDay: 18
      };

      const first = await ensureInvoiceForCardDate(tx as never, card, '2026-05-15', '2026-06-15');
      expect(first.id).toBe('inv-1');
      expect(tx.invoice.create).toHaveBeenCalledTimes(1);

      const second = await ensureInvoiceForCardDate(tx as never, card, '2026-05-15', '2026-06-15');
      expect(second.id).toBe('inv-1');
      expect(tx.invoice.create).toHaveBeenCalledTimes(1);
    });
  });
});

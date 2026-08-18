/**
 * Mobile-facing billing-cycle helpers.
 * Pure cycle math lives in @mybills/utils; this file wraps Date/locale for UI.
 */
export {
  LAST_DAY_CLOSING_DAY,
  addMonthsToYearMonth,
  canPayBillingCycle as canPayBillingCycleYmd,
  compareYmd,
  formatYearMonth,
  getClosedBillingCycleRange,
  getCycleContainingDate,
  getInvoiceDueYmd,
  getInvoicePaymentMonth,
  getNextDueYmd,
  getOpenBillingCycleRange as getOpenBillingCycleRangeYmd,
  parseYearMonth,
  paymentMonthIndex,
  resolveClosingDay,
  shiftBillingCycle,
  utcTodayYmd,
  ymdFromLocalDate,
  type BillingCycleRange,
  type YearMonth
} from '@mybills/utils';

import {
  canPayBillingCycle as canPayBillingCycleYmd,
  daysUntilNextDueDay as daysUntilNextDueDayYmd,
  formatYearMonth,
  getNextDueYmd,
  getOpenBillingCycleRange as getOpenBillingCycleRangeYmd,
  ymdFromLocalDate,
  type BillingCycleRange,
  type YearMonth
} from '@mybills/utils';

export function getOpenBillingCycleRange(
  closingDay: number,
  today: Date = new Date()
): BillingCycleRange {
  return getOpenBillingCycleRangeYmd(closingDay, ymdFromLocalDate(today));
}

/** @deprecated Prefer getOpenBillingCycleRange — same open-cycle semantics. */
export function getCurrentBillingCycleRange(
  closingDay: number,
  today: Date = new Date()
): BillingCycleRange {
  return getOpenBillingCycleRange(closingDay, today);
}

export function canPayBillingCycle(cycleEndYmd: string, today: Date = new Date()): boolean {
  return canPayBillingCycleYmd(cycleEndYmd, ymdFromLocalDate(today));
}

export function daysUntilNextDueDay(dueDay: number, today: Date = new Date()): number {
  return daysUntilNextDueDayYmd(dueDay, ymdFromLocalDate(today));
}

export function getNextDueDate(dueDay: number, today: Date = new Date()): Date {
  const dueYmd = getNextDueYmd(dueDay, ymdFromLocalDate(today));
  const parts = dueYmd.slice(0, 10).split('-').map((p) => Number(p));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

export function formatDueDate(dueDay: number, today: Date, locale: string): string {
  const dueDate = getNextDueDate(dueDay, today);
  try {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short'
    }).format(dueDate);
  } catch {
    return ymdFromLocalDate(dueDate);
  }
}

export function formatYearMonthLabel(
  ym: YearMonth,
  locale: string,
  options: { withYear?: boolean } = {}
): string {
  const withYear = options.withYear ?? true;
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      ...(withYear ? { year: 'numeric' as const } : {})
    }).format(new Date(ym.year, ym.month - 1, 1));
  } catch {
    return formatYearMonth(ym);
  }
}

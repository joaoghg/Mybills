/**
 * Closed billing-cycle helpers for invoice payment.
 * Closing day STARTS a cycle; cycleEnd is the inclusive last day (day before the next closing).
 */

export const LAST_DAY_CLOSING_DAY = 31;

/** Effective closing day; 31 is clamped to each month's last day by closingYmd. */
export function resolveClosingDay(card: {
  closingDay: number;
  closingOnLastDay: boolean;
}): number {
  return card.closingOnLastDay ? LAST_DAY_CLOSING_DAY : card.closingDay;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function closingYmd(year: number, monthIndex: number, closingDay: number): string {
  const day = Math.min(closingDay, lastDayOfMonth(year, monthIndex));
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function ymdParts(ymd: string): { year: number; monthIndex: number; day: number } {
  const [year, month, day] = ymd.slice(0, 10).split('-').map(Number);
  return {
    year: year ?? 1970,
    monthIndex: (month ?? 1) - 1,
    day: day ?? 1
  };
}

function addOneCalendarDay(ymd: string): string {
  const { year, monthIndex, day } = ymdParts(ymd);
  const next = new Date(Date.UTC(year, monthIndex, day + 1));
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}-${pad2(next.getUTCDate())}`;
}

function subtractOneCalendarDay(ymd: string): string {
  const { year, monthIndex, day } = ymdParts(ymd);
  const prev = new Date(Date.UTC(year, monthIndex, day - 1));
  return `${prev.getUTCFullYear()}-${pad2(prev.getUTCMonth() + 1)}-${pad2(prev.getUTCDate())}`;
}

function compareYmd(a: string, b: string): number {
  const aa = a.slice(0, 10);
  const bb = b.slice(0, 10);
  if (aa === bb) {
    return 0;
  }
  return aa < bb ? -1 : 1;
}

function prevMonthClosing(year: number, monthIndex: number, closingDay: number): string {
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const prevMonth = monthIndex === 0 ? 11 : monthIndex - 1;
  return closingYmd(prevYear, prevMonth, closingDay);
}

function nextMonthClosing(year: number, monthIndex: number, closingDay: number): string {
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const nextMonth = monthIndex === 11 ? 0 : monthIndex + 1;
  return closingYmd(nextYear, nextMonth, closingDay);
}

export type YearMonth = {
  year: number;
  month: number;
};

export function utcTodayYmd(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

export function formatYearMonth(ym: YearMonth): string {
  return `${ym.year}-${pad2(ym.month)}`;
}

export function parseYearMonth(ymdOrYm: string): YearMonth {
  const parts = ymdOrYm.slice(0, 10).split('-').map(Number);
  return {
    year: parts[0] ?? 1970,
    month: parts[1] ?? 1
  };
}

export function paymentMonthIndex(ym: YearMonth): number {
  return ym.year * 12 + (ym.month - 1);
}

export function inclusivePaymentMonthCount(from: YearMonth, to: YearMonth): number {
  return paymentMonthIndex(to) - paymentMonthIndex(from) + 1;
}

/**
 * Cycle that contains `ymd`: [closingDay, nextClosingDay - 1].
 * Closing day starts a new cycle.
 */
export function getCycleContainingDate(
  closingDay: number,
  ymd: string
): { start: string; end: string } {
  const date = ymd.slice(0, 10);
  const { year, monthIndex } = ymdParts(date);
  const thisClose = closingYmd(year, monthIndex, closingDay);

  if (compareYmd(date, thisClose) < 0) {
    const prevClose = prevMonthClosing(year, monthIndex, closingDay);
    return { start: prevClose, end: subtractOneCalendarDay(thisClose) };
  }

  const nextClose = nextMonthClosing(year, monthIndex, closingDay);
  return { start: thisClose, end: subtractOneCalendarDay(nextClose) };
}

/**
 * Due date for the invoice that contains `ymd`: first dueDay strictly after the cycle closing day.
 */
export function getInvoiceDueYmd(closingDay: number, dueDay: number, ymd: string): string {
  const cycle = getCycleContainingDate(closingDay, ymd);
  const closeYmd = addOneCalendarDay(cycle.end);
  const { year, monthIndex } = ymdParts(closeYmd);
  const dueSameMonth = closingYmd(year, monthIndex, dueDay);

  if (compareYmd(dueSameMonth, closeYmd) > 0) {
    return dueSameMonth;
  }

  return nextMonthClosing(year, monthIndex, dueDay);
}

/**
 * Payment month for the invoice that contains `ymd`:
 * calendar month of the invoice due date (vencimento).
 */
export function getInvoicePaymentMonth(
  closingDay: number,
  dueDay: number,
  ymd: string
): YearMonth {
  return parseYearMonth(getInvoiceDueYmd(closingDay, dueDay, ymd));
}

/**
 * Closed cycle identified by inclusive cycleEnd (day before a closing day).
 * Returns null when cycleEnd is not aligned with the card closing day.
 */
export function getClosedBillingCycleRange(
  closingDay: number,
  cycleEndYmd: string
): { start: string; end: string } | null {
  const end = cycleEndYmd.slice(0, 10);
  const thisClose = addOneCalendarDay(end);
  const { year, monthIndex } = ymdParts(thisClose);
  const expectedClose = closingYmd(year, monthIndex, closingDay);

  if (thisClose !== expectedClose) {
    return null;
  }

  const prevClose = prevMonthClosing(year, monthIndex, closingDay);
  return { start: prevClose, end };
}

/** Payable once today is on/after the closing day that ended the cycle (day after cycleEnd). */
export function canPayBillingCycle(cycleEndYmd: string, todayYmd: string): boolean {
  const payFrom = addOneCalendarDay(cycleEndYmd.slice(0, 10));
  return compareYmd(todayYmd.slice(0, 10), payFrom) >= 0;
}

/**
 * Closed billing-cycle helpers for invoice payment.
 * Closing day STARTS a cycle; cycleEnd is the inclusive last day (day before the next closing).
 */

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

export function utcTodayYmd(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
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

/**
 * Credit-card billing cycles.
 *
 * Closing day STARTS a cycle (inclusive). The day before the next closing is the end.
 *
 * Examples with closingDay = 4:
 * - Open on 10/May → { start: 'YYYY-05-04', end: 'YYYY-06-03' }
 * - Open on 03/May → { start: 'YYYY-04-04', end: 'YYYY-05-03' }
 * - Day 4 enters the new cycle: open on 04/May → { start: 'YYYY-05-04', end: 'YYYY-06-03' }
 * - Closed ending 03/Jun → { start: 'YYYY-05-04', end: 'YYYY-06-03' }
 * - canPay for cycle ending 03/Jun is true from 04/Jun onward
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymdFromLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function closingYmd(year: number, monthIndex: number, closingDay: number): string {
  const day = Math.min(closingDay, lastDayOfMonth(year, monthIndex));
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

function ymdToLocalDate(ymd: string): Date {
  const parts = ymd.slice(0, 10).split('-').map((p) => Number(p));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function addOneCalendarDay(ymd: string): string {
  const d = ymdToLocalDate(ymd);
  d.setDate(d.getDate() + 1);
  return ymdFromLocalDate(d);
}

function subtractOneCalendarDay(ymd: string): string {
  const d = ymdToLocalDate(ymd);
  d.setDate(d.getDate() - 1);
  return ymdFromLocalDate(d);
}

function compareYmd(a: string, b: string): number {
  const aa = a.slice(0, 10);
  const bb = b.slice(0, 10);
  if (aa === bb) return 0;
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

/** Open (current) invoice: [thisClose, nextClose - 1]. Day of closing belongs to the new cycle. */
export function getOpenBillingCycleRange(
  closingDay: number,
  today: Date
): { start: string; end: string } {
  const todayYmd = ymdFromLocalDate(today);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const thisClose = closingYmd(y, m0, closingDay);

  if (compareYmd(todayYmd, thisClose) < 0) {
    const prevClose = prevMonthClosing(y, m0, closingDay);
    return { start: prevClose, end: subtractOneCalendarDay(thisClose) };
  }

  const nextClose = nextMonthClosing(y, m0, closingDay);
  return { start: thisClose, end: subtractOneCalendarDay(nextClose) };
}

/** @deprecated Prefer getOpenBillingCycleRange — same open-cycle semantics. */
export function getCurrentBillingCycleRange(
  closingDay: number,
  today: Date
): { start: string; end: string } {
  return getOpenBillingCycleRange(closingDay, today);
}

/**
 * Closed cycle identified by its inclusive end YMD (day before a closing day).
 * Range: [prevClose, thisClose - 1] where thisClose = cycleEnd + 1.
 */
export function getClosedBillingCycleRange(
  closingDay: number,
  cycleEndYmd: string
): { start: string; end: string } {
  const end = cycleEndYmd.slice(0, 10);
  const thisClose = addOneCalendarDay(end);
  const closeDate = ymdToLocalDate(thisClose);
  const prevClose = prevMonthClosing(
    closeDate.getFullYear(),
    closeDate.getMonth(),
    closingDay
  );
  return { start: prevClose, end };
}

export function shiftBillingCycle(
  closingDay: number,
  current: { start: string; end: string },
  delta: -1 | 1
): { start: string; end: string } {
  if (delta === -1) {
    const end = subtractOneCalendarDay(current.start.slice(0, 10));
    return getClosedBillingCycleRange(closingDay, end);
  }

  const start = addOneCalendarDay(current.end.slice(0, 10));
  const startDate = ymdToLocalDate(start);
  const nextClose = nextMonthClosing(
    startDate.getFullYear(),
    startDate.getMonth(),
    closingDay
  );
  return { start, end: subtractOneCalendarDay(nextClose) };
}

/** Payable once today is on/after the closing day that ended the cycle (day after cycleEnd). */
export function canPayBillingCycle(cycleEndYmd: string, today: Date): boolean {
  const payFrom = addOneCalendarDay(cycleEndYmd.slice(0, 10));
  return compareYmd(ymdFromLocalDate(today), payFrom) >= 0;
}

export function daysUntilNextDueDay(dueDay: number, today: Date): number {
  const todayYmd = ymdFromLocalDate(today);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const thisDue = closingYmd(y, m0, dueDay);
  if (compareYmd(thisDue, todayYmd) >= 0) {
    return diffDaysUtcMidnight(todayYmd, thisDue);
  }
  const nextDue = nextMonthClosing(y, m0, dueDay);
  return diffDaysUtcMidnight(todayYmd, nextDue);
}

export function getNextDueDate(dueDay: number, today: Date): Date {
  const todayYmd = ymdFromLocalDate(today);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const thisDue = closingYmd(y, m0, dueDay);
  const dueYmd =
    compareYmd(thisDue, todayYmd) >= 0 ? thisDue : nextMonthClosing(y, m0, dueDay);
  return ymdToLocalDate(dueYmd);
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

function diffDaysUtcMidnight(fromYmd: string, toYmd: string): number {
  const fp = fromYmd.slice(0, 10).split('-').map((p) => Number(p));
  const tp = toYmd.slice(0, 10).split('-').map((p) => Number(p));
  const fy = fp[0] ?? 1970;
  const fm = fp[1] ?? 1;
  const fd = fp[2] ?? 1;
  const ty = tp[0] ?? 1970;
  const tm = tp[1] ?? 1;
  const td = tp[2] ?? 1;
  const from = Date.UTC(fy, fm - 1, fd);
  const to = Date.UTC(ty, tm - 1, td);
  return Math.round((to - from) / 86_400_000);
}

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

function addOneCalendarDay(ymd: string): string {
  const parts = ymd.split('-').map((p) => Number(p));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const next = new Date(y, m - 1, d);
  next.setDate(next.getDate() + 1);
  return ymdFromLocalDate(next);
}

function compareYmd(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function getCurrentBillingCycleRange(
  closingDay: number,
  today: Date
): { start: string; end: string } {
  const todayYmd = ymdFromLocalDate(today);
  const y = today.getFullYear();
  const m0 = today.getMonth();

  const thisClose = closingYmd(y, m0, closingDay);

  if (compareYmd(todayYmd, thisClose) <= 0) {
    const prevYear = m0 === 0 ? y - 1 : y;
    const prevMonth = m0 === 0 ? 11 : m0 - 1;
    const prevClose = closingYmd(prevYear, prevMonth, closingDay);
    const start = addOneCalendarDay(prevClose);
    return { start, end: thisClose };
  }

  const nextYear = m0 === 11 ? y + 1 : y;
  const nextMonth = m0 === 11 ? 0 : m0 + 1;
  const nextClose = closingYmd(nextYear, nextMonth, closingDay);
  const start = addOneCalendarDay(thisClose);
  return { start, end: nextClose };
}

export function daysUntilNextDueDay(dueDay: number, today: Date): number {
  const todayYmd = ymdFromLocalDate(today);
  const y = today.getFullYear();
  const m0 = today.getMonth();
  const thisDue = closingYmd(y, m0, dueDay);
  if (compareYmd(thisDue, todayYmd) >= 0) {
    return diffDaysUtcMidnight(todayYmd, thisDue);
  }
  const ny = m0 === 11 ? y + 1 : y;
  const nm = m0 === 11 ? 0 : m0 + 1;
  const nextDue = closingYmd(ny, nm, dueDay);
  return diffDaysUtcMidnight(todayYmd, nextDue);
}

function diffDaysUtcMidnight(fromYmd: string, toYmd: string): number {
  const fp = fromYmd.split('-').map((p) => Number(p));
  const tp = toYmd.split('-').map((p) => Number(p));
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

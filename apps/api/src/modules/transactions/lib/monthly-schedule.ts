export type YmdParts = {
  year: number;
  month: number;
  day: number;
};

export function parseYmd(ymd: string): YmdParts {
  const parts = ymd.split('-').map((part) => Number(part));
  return {
    year: parts[0] ?? 1970,
    month: parts[1] ?? 1,
    day: parts[2] ?? 1
  };
}

export function formatYmd(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function clampDay(year: number, month: number, day: number): number {
  return Math.min(day, daysInMonth(year, month));
}

/** Add `months` to a YYYY-MM-DD date, preserving preferred day when possible. */
export function addMonthsPreserveDay(ymd: string, months: number, anchorDay: number): string {
  const { year, month } = parseYmd(ymd);
  const totalMonths = year * 12 + (month - 1) + months;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const day = clampDay(nextYear, nextMonth, anchorDay);
  return formatYmd(nextYear, nextMonth, day);
}

export function compareYmd(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function utcTodayYmd(now: Date = new Date()): string {
  return formatYmd(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate());
}

export function monthIndex(ymd: string): number {
  const { year, month } = parseYmd(ymd);
  return year * 12 + (month - 1);
}

/** Inclusive month span between two dates (same month = 1). */
export function inclusiveMonthCount(startYmd: string, endYmd: string): number {
  return monthIndex(endYmd) - monthIndex(startYmd) + 1;
}

export type OccurrenceDraft = {
  occurrenceNumber: number;
  date: string;
};

/**
 * Installment dates: first = start, last = end, middle preserve anchor day.
 * Requires end after start and at least 2 months.
 */
export function generateInstallmentOccurrences(startYmd: string, endYmd: string): OccurrenceDraft[] {
  if (compareYmd(endYmd, startYmd) <= 0) {
    throw new Error('endDate must be after startDate');
  }

  const total = inclusiveMonthCount(startYmd, endYmd);
  if (total < 2) {
    throw new Error('installment requires at least 2 months');
  }

  const anchorDay = parseYmd(startYmd).day;
  const occurrences: OccurrenceDraft[] = [{ occurrenceNumber: 1, date: startYmd }];

  for (let index = 1; index < total - 1; index += 1) {
    occurrences.push({
      occurrenceNumber: index + 1,
      date: addMonthsPreserveDay(startYmd, index, anchorDay)
    });
  }

  occurrences.push({ occurrenceNumber: total, date: endYmd });
  return occurrences;
}

/**
 * Installment dates from start for exactly `count` months (1st = startYmd).
 */
export function generateInstallmentOccurrencesByCount(
  startYmd: string,
  count: number
): OccurrenceDraft[] {
  if (count < 2) {
    throw new Error('installment requires at least 2 months');
  }

  return generateRecurringOccurrences(startYmd, count, 1);
}

/**
 * Recurring monthly dates from start for `count` occurrences (1-based numbering from startNumber).
 */
export function generateRecurringOccurrences(
  startYmd: string,
  count: number,
  startNumber = 1,
  anchorDay?: number
): OccurrenceDraft[] {
  if (count < 1) {
    return [];
  }

  const day = anchorDay ?? parseYmd(startYmd).day;
  const occurrences: OccurrenceDraft[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const occurrenceNumber = startNumber + offset;
    const date =
      occurrenceNumber === 1
        ? startYmd
        : addMonthsPreserveDay(startYmd, occurrenceNumber - 1, day);
    occurrences.push({ occurrenceNumber, date });
  }

  return occurrences;
}

/** How many occurrences needed so the last date is on/after horizonEndYmd. */
export function countOccurrencesUntilHorizon(
  startYmd: string,
  anchorDay: number,
  fromNumber: number,
  horizonEndYmd: string
): number {
  if (fromNumber < 1) {
    return 0;
  }

  let count = 0;
  let occurrenceNumber = fromNumber;

  while (count < 240) {
    const date = addMonthsPreserveDay(startYmd, occurrenceNumber - 1, anchorDay);
    count += 1;
    if (compareYmd(date, horizonEndYmd) >= 0) {
      break;
    }
    occurrenceNumber += 1;
  }

  return count;
}

export function horizonEndYmd(fromYmd: string, monthsAhead: number): string {
  return addMonthsPreserveDay(fromYmd, monthsAhead, parseYmd(fromYmd).day);
}

export const RECURRING_HORIZON_MONTHS = 12;

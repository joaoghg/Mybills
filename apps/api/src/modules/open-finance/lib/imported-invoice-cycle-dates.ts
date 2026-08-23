import {
  addOneCalendarDay,
  getCycleContainingDate,
  getInvoiceDueYmd,
  resolveClosingDay,
  subtractOneCalendarDay
} from '@mybills/utils';

export type ImportedCycleCard = {
  closingDay: number;
  closingOnLastDay: boolean;
  dueDay: number;
};

export type ImportedCycleDates = {
  startsOn: Date;
  endsOn: Date;
  dueOn: Date;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymdFromUtcDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function utcDateFromYmd(ymd: string): Date {
  const parts = ymd.slice(0, 10).split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

export function dateOnlyUtc(value: Date): Date {
  return utcDateFromYmd(ymdFromUtcDate(value));
}

function yearMonthOf(ymd: string): string {
  return ymd.slice(0, 7);
}

function nextYearMonth(yearMonth: string): string {
  const parts = yearMonth.split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${pad2(month + 1)}`;
}

export function yearMonthFromUtcDate(date: Date): string {
  return ymdFromUtcDate(date).slice(0, 7);
}

export function dueOnYearMonthRange(yearMonth: string): { gte: Date; lt: Date } {
  return {
    gte: utcDateFromYmd(`${yearMonth}-01`),
    lt: utcDateFromYmd(`${nextYearMonth(yearMonth)}-01`)
  };
}

/**
 * Inclusive getCycleContainingDate → stored half-open range for PLUGGY invoices:
 * startsOn = cycle start (closing day), endsOn = next closing day.
 */
export function importedCycleDatesForAnchor(
  card: ImportedCycleCard,
  anchor: Date
): ImportedCycleDates {
  const closingDay = resolveClosingDay(card);
  const anchorYmd = ymdFromUtcDate(anchor);
  const cycle = getCycleContainingDate(closingDay, anchorYmd);
  return {
    startsOn: utcDateFromYmd(cycle.start),
    endsOn: utcDateFromYmd(addOneCalendarDay(cycle.end)),
    dueOn: utcDateFromYmd(getInvoiceDueYmd(closingDay, card.dueDay, anchorYmd))
  };
}

/**
 * Billed cycle: anchor on the day before bill.closingOn so inclusive math
 * returns the closed cycle. For fixed-day cards, persist endsOn = closingOn.
 * For last-day cards, persist the card's half-open last-day range so a
 * weekend-shifted bill (e.g. 30) shares endsOn with the unbilled cycle (31).
 * dueOn is always the bill due date.
 */
export function importedCycleDatesFromBill(
  card: ImportedCycleCard,
  bill: { dueOn: Date; closingOn: Date | null }
): ImportedCycleDates {
  const rawEndsOn = dateOnlyUtc(bill.closingOn ?? bill.dueOn);
  const dueOn = dateOnlyUtc(bill.dueOn);

  if (card.closingOnLastDay) {
    const anchor = utcDateFromYmd(subtractOneCalendarDay(ymdFromUtcDate(rawEndsOn)));
    const cycleDates = importedCycleDatesForAnchor(card, anchor);
    return { ...cycleDates, dueOn };
  }

  const closingDay = resolveClosingDay(card);
  const anchorYmd = subtractOneCalendarDay(ymdFromUtcDate(rawEndsOn));
  const cycle = getCycleContainingDate(closingDay, anchorYmd);
  return {
    startsOn: utcDateFromYmd(cycle.start),
    endsOn: rawEndsOn,
    dueOn
  };
}

export function billCycleAnchorDate(bill: { dueOn: Date; closingOn: Date | null }): Date {
  const endsOn = dateOnlyUtc(bill.closingOn ?? bill.dueOn);
  return utcDateFromYmd(subtractOneCalendarDay(ymdFromUtcDate(endsOn)));
}

export function findAnchorYmdForDueMonth(card: ImportedCycleCard, dueYearMonth: string): string {
  const closingDay = resolveClosingDay(card);
  const parts = dueYearMonth.slice(0, 7).split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const lastDayOfDueMonth = new Date(Date.UTC(year, month, 0));

  for (let offset = 0; offset < 93; offset += 1) {
    const candidate = new Date(
      Date.UTC(
        lastDayOfDueMonth.getUTCFullYear(),
        lastDayOfDueMonth.getUTCMonth(),
        lastDayOfDueMonth.getUTCDate() - offset
      )
    );
    const ymd = ymdFromUtcDate(candidate);
    if (yearMonthOf(getInvoiceDueYmd(closingDay, card.dueDay, ymd)) === dueYearMonth.slice(0, 7)) {
      return ymd;
    }
  }

  return `${dueYearMonth.slice(0, 7)}-01`;
}

export function importedCycleDatesForDueMonth(
  card: ImportedCycleCard,
  dueYearMonth: string
): ImportedCycleDates {
  return importedCycleDatesForAnchor(card, utcDateFromYmd(findAnchorYmdForDueMonth(card, dueYearMonth)));
}

import { LAST_DAY_CLOSING_DAY } from '@mybills/utils';

export type DeriveImportedCardCycleDaysInput = {
  accountClosingDate: Date | null;
  accountDueDate: Date | null;
  billClosingDates: Date[];
  billDueDates: Date[];
};

export type DerivedImportedCardCycleDays = {
  closingDay: number | null;
  closingOnLastDay: boolean | null;
  dueDay: number | null;
};

export function isLastCalendarDayOfMonth(date: Date): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return day === last;
}

export function cycleDaysFromAccountClosingDate(closingDate: Date): {
  closingDay: number;
  closingOnLastDay: boolean;
} {
  if (isLastCalendarDayOfMonth(closingDate)) {
    return { closingDay: LAST_DAY_CLOSING_DAY, closingOnLastDay: true };
  }
  return { closingDay: closingDate.getUTCDate(), closingOnLastDay: false };
}

function lastDayOfMonthUtc(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function isInLastThreeCalendarDays(date: Date): boolean {
  return lastDayOfMonthUtc(date) - date.getUTCDate() <= 2;
}

function modeDay(days: number[]): number | null {
  if (days.length === 0) {
    return null;
  }

  const counts = new Map<number, number>();
  for (const day of days) {
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  let bestDay = days[0] ?? null;
  let bestCount = 0;
  for (const [day, count] of counts) {
    if (bestDay == null || count > bestCount || (count === bestCount && day < bestDay)) {
      bestDay = day;
      bestCount = count;
    }
  }
  return bestDay;
}

function majority(count: number, total: number): boolean {
  return total > 0 && count * 2 > total;
}

function closingFromBillHistory(billClosingDates: Date[]): {
  closingDay: number;
  closingOnLastDay: boolean;
} | null {
  if (billClosingDates.length === 0) {
    return null;
  }

  const lastDayCount = billClosingDates.filter(isLastCalendarDayOfMonth).length;
  if (majority(lastDayCount, billClosingDates.length)) {
    return { closingDay: LAST_DAY_CLOSING_DAY, closingOnLastDay: true };
  }

  const nearMonthEnd = billClosingDates.filter(isInLastThreeCalendarDays);
  const distinctNearEndDays = new Set(nearMonthEnd.map((date) => date.getUTCDate()));
  if (majority(nearMonthEnd.length, billClosingDates.length) && distinctNearEndDays.size > 1) {
    return { closingDay: LAST_DAY_CLOSING_DAY, closingOnLastDay: true };
  }

  const closingDay = modeDay(billClosingDates.map((date) => date.getUTCDate()));
  if (closingDay == null) {
    return null;
  }
  return { closingDay, closingOnLastDay: false };
}

export function deriveImportedCardCycleDays(
  input: DeriveImportedCardCycleDaysInput
): DerivedImportedCardCycleDays {
  const dueDay =
    input.accountDueDate != null
      ? input.accountDueDate.getUTCDate()
      : modeDay(input.billDueDates.map((date) => date.getUTCDate()));

  if (input.accountClosingDate) {
    const closing = cycleDaysFromAccountClosingDate(input.accountClosingDate);
    return {
      closingDay: closing.closingDay,
      closingOnLastDay: closing.closingOnLastDay,
      dueDay
    };
  }

  const fromBills = closingFromBillHistory(input.billClosingDates);
  return {
    closingDay: fromBills?.closingDay ?? null,
    closingOnLastDay: fromBills?.closingOnLastDay ?? null,
    dueDay
  };
}

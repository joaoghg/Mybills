import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';

const CENTS_SCALE = 100;

export function providerAmountToCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new InvalidArgumentError({
      code: 'open_finance.invalid_money',
      i18nKey: 'errors.open_finance.invalid_money'
    });
  }

  const cents = Math.round(amount * CENTS_SCALE);

  if (!Number.isSafeInteger(cents)) {
    throw new InvalidArgumentError({
      code: 'open_finance.money_overflow',
      i18nKey: 'errors.open_finance.money_overflow'
    });
  }

  return cents;
}

export function optionalProviderAmountToCents(amount: number | null | undefined): number | null {
  if (amount === null || amount === undefined) {
    return null;
  }

  return providerAmountToCents(amount);
}

export function decimalToString(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return String(value);
}

export function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toDateOnly(value: Date | string | null | undefined): Date | null {
  const iso = toIsoString(value);
  if (!iso) {
    return null;
  }

  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

export function yearMonthFromDate(value: Date | string | null | undefined): string | null {
  const iso = toIsoString(value);
  return iso ? iso.slice(0, 7) : null;
}

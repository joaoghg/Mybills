export const MONEY_DECIMAL_SEPARATOR = ',' as const;

export const DEFAULT_MAX_MONEY_DIGITS = 11;

export function formatMoneyDigits(digits: string): string {
  if (digits.length === 0) {
    return '';
  }

  const cents = Number.parseInt(digits, 10);
  if (!Number.isFinite(cents) || cents < 0) {
    return '';
  }

  const whole = Math.floor(cents / 100);
  const fraction = (cents % 100).toString().padStart(2, '0');
  return `${whole}${MONEY_DECIMAL_SEPARATOR}${fraction}`;
}

export function moneyDigitsToCents(digits: string): number {
  if (digits.length === 0) {
    return 0;
  }

  const cents = Number.parseInt(digits, 10);
  return Number.isFinite(cents) && cents >= 0 ? cents : 0;
}

export function centsToMoneyDigits(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) {
    return '';
  }
  return Math.trunc(cents).toString();
}

export function extractMoneyDigits(text: string): string {
  return text.replace(/\D/g, '');
}

export type ApplyMoneyInputChangeParams = {
  previousDigits: string;
  incomingText: string;
  maxDigits?: number;
};

export function applyMoneyInputChange({
  previousDigits,
  incomingText,
  maxDigits = DEFAULT_MAX_MONEY_DIGITS
}: ApplyMoneyInputChangeParams): string {
  const previousFormatted = formatMoneyDigits(previousDigits);
  const incomingDigits = extractMoneyDigits(incomingText);

  if (incomingText.length < previousFormatted.length) {
    return previousDigits.slice(0, -1);
  }

  if (incomingDigits.length > previousDigits.length) {
    return incomingDigits.slice(0, maxDigits);
  }

  return previousDigits;
}

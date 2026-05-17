export function formatDecimalValue(value: number, locale: string, maxFractionDigits = 1): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

import {
  addMonthsToYearMonth,
  formatYearMonthLabel,
  getInvoicePaymentMonth,
  parseYearMonth,
  resolveClosingDay,
  type YearMonth
} from '@/shared/lib/billing-cycle';

export const MIN_INSTALLMENT_COUNT = 2;
export const MAX_INSTALLMENT_COUNT = 360;

export type InstallmentPreview =
  | { kind: 'CARD'; count: number; first: string; last: string }
  | { kind: 'ACCOUNT'; count: number; last: string };

type BuildInstallmentPreviewParams = {
  installments: number | null;
  dateYmd: string;
  locale: string;
  card: { closingDay: number; closingOnLastDay: boolean; dueDay: number } | null;
};

/**
 * Preview of where the first and last installment land.
 * On a card the series follows invoice payment months, otherwise it follows the purchase date.
 */
export function buildInstallmentPreview({
  installments,
  dateYmd,
  locale,
  card
}: BuildInstallmentPreviewParams): InstallmentPreview | null {
  if (installments === null || installments < MIN_INSTALLMENT_COUNT || !dateYmd) {
    return null;
  }

  const purchaseMonth = parseYearMonth(dateYmd);
  const firstMonth = card
    ? getInvoicePaymentMonth(resolveClosingDay(card), card.dueDay, dateYmd)
    : purchaseMonth;
  const lastMonth = addMonthsToYearMonth(firstMonth, installments - 1);

  const label = (ym: YearMonth): string =>
    formatYearMonthLabel(ym, locale, { withYear: ym.year !== purchaseMonth.year });

  if (card) {
    return {
      kind: 'CARD',
      count: installments,
      first: label(firstMonth),
      last: label(lastMonth)
    };
  }

  return { kind: 'ACCOUNT', count: installments, last: label(lastMonth) };
}

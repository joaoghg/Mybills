import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

function messageForIssue(issue: ZodError['issues'][number], t: TFunction): string | null {
  const field = issue.path[0];
  if (field === 'amount') {
    return t('transactions.validation.amountRequired');
  }
  if (field === 'type') {
    return t('transactions.validation.typeRequired');
  }
  if (field === 'date') {
    return t('transactions.validation.dateRequired');
  }
  if (field === 'accountId') {
    return t('transactions.validation.accountInvalid');
  }
  if (field === 'categoryId') {
    return t('transactions.validation.categoryInvalid');
  }
  if (field === 'cardId') {
    return t('transactions.validation.cardInvalid');
  }
  if (field === 'schedule') {
    return t('transactions.validation.installmentEndDateInvalid');
  }
  return null;
}

export type ScheduleMode = 'NONE' | 'INSTALLMENT' | 'RECURRING';

export function validateCreateTransactionClient(
  t: TFunction,
  amountCents: number,
  isPaid: boolean,
  accountId: string | null,
  scheduleMode: ScheduleMode = 'NONE',
  dateYmd?: string,
  endDateYmd?: string | null
): string | null {
  if (amountCents <= 0) {
    return t('transactions.validation.amountRequired');
  }
  if (isPaid && !accountId) {
    return t('transactions.validation.paidRequiresAccount');
  }
  if (scheduleMode === 'INSTALLMENT') {
    if (!endDateYmd) {
      return t('transactions.validation.installmentEndDateRequired');
    }
    if (dateYmd && endDateYmd <= dateYmd) {
      return t('transactions.validation.installmentEndDateInvalid');
    }
    if (dateYmd && endDateYmd) {
      const start = dateYmd.split('-').map(Number);
      const end = endDateYmd.split('-').map(Number);
      const startMonths = (start[0] ?? 0) * 12 + ((start[1] ?? 1) - 1);
      const endMonths = (end[0] ?? 0) * 12 + ((end[1] ?? 1) - 1);
      if (endMonths - startMonths + 1 < 2) {
        return t('transactions.validation.installmentMinMonths');
      }
    }
  }
  return null;
}

export function translateCreateTransactionZodError(t: TFunction, error: ZodError): string {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const msg = messageForIssue(issue, t);
    if (msg && !messages.includes(msg)) {
      messages.push(msg);
    }
  }
  if (messages.length === 0) {
    return t('transactions.errors.validation');
  }
  return messages.join('\n');
}

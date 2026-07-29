import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

import {
  MAX_INSTALLMENT_COUNT,
  MIN_INSTALLMENT_COUNT
} from '@/features/transactions/utils/installment-preview';

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
    return t('transactions.validation.installmentCountInvalid');
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
  installments?: number | null
): string | null {
  if (amountCents <= 0) {
    return t('transactions.validation.amountRequired');
  }
  if (isPaid && !accountId) {
    return t('transactions.validation.paidRequiresAccount');
  }
  if (scheduleMode === 'INSTALLMENT') {
    if (installments == null) {
      return t('transactions.validation.installmentCountRequired');
    }
    if (!Number.isInteger(installments) || installments < MIN_INSTALLMENT_COUNT) {
      return t('transactions.validation.installmentMinCount', { min: MIN_INSTALLMENT_COUNT });
    }
    if (installments > MAX_INSTALLMENT_COUNT) {
      return t('transactions.validation.installmentMaxCount', { max: MAX_INSTALLMENT_COUNT });
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

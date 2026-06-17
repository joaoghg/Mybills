import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

export function validateCreateTransferClient(
  t: TFunction,
  amountCents: number,
  sourceAccountId: string | null,
  destinationAccountId: string | null
): string | null {
  if (amountCents <= 0) {
    return t('transfers.validation.amountRequired');
  }
  if (!sourceAccountId) {
    return t('transfers.validation.sourceAccountRequired');
  }
  if (!destinationAccountId) {
    return t('transfers.validation.destinationAccountRequired');
  }
  if (sourceAccountId === destinationAccountId) {
    return t('transfers.validation.accountsMustDiffer');
  }
  return null;
}

export function translateCreateTransferZodError(t: TFunction, error: ZodError): string {
  const firstIssue = error.issues[0];
  if (firstIssue?.path[0] === 'amount') {
    return t('transfers.validation.amountRequired');
  }
  if (firstIssue?.path[0] === 'date') {
    return t('transfers.validation.dateRequired');
  }
  return t('transfers.errors.validation');
}

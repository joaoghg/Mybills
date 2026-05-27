import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

import { translateCreateTransactionZodError } from './create-transaction-validation';

export function translateCreateTransactionError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return translateCreateTransactionZodError(t, error);
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('transactions.errors.network');
    }
    if (error.code === 'transactions.account_not_found') {
      return t('transactions.errors.accountNotFound');
    }
    if (error.code === 'transactions.invalid_category_id') {
      return t('transactions.errors.categoryNotFound');
    }
    if (error.code === 'transactions.invalid_credit_card_id') {
      return t('transactions.errors.cardNotFound');
    }
    if (error.code === 'transactions.invalid_is_paid') {
      return t('transactions.errors.invalidIsPaid');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('transactions.errors.validation');
    }
    return error.message ? error.message : t('transactions.errors.generic');
  }
  return t('transactions.errors.generic');
}

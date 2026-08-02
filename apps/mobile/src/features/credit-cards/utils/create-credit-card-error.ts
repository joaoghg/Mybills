import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

import { translateCreateCreditCardZodError } from './create-credit-card-validation';

export function translateCreateCreditCardError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return translateCreateCreditCardZodError(t, error);
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('creditCards.errors.network');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('creditCards.errors.validation');
    }
    return error.message ? error.message : t('creditCards.errors.generic');
  }
  return t('creditCards.errors.generic');
}

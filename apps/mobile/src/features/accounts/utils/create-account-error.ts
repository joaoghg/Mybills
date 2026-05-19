import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

import { translateCreateAccountZodError } from './create-account-validation';

export function translateCreateAccountError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return translateCreateAccountZodError(t, error);
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('accounts.errors.network');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('accounts.errors.validation');
    }
    return error.message ? error.message : t('accounts.errors.generic');
  }
  return t('accounts.errors.generic');
}

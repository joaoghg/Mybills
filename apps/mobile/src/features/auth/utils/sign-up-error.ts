import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

import { translateSignUpZodError } from './signup-validation';

export function translateSignupError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return translateSignUpZodError(t, error);
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('auth.errors.network');
    }
    if (error.code === 'auth.email_already_registered') {
      return t('auth.errors.emailTaken');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('auth.errors.validation');
    }
    return error.message ? error.message : t('auth.errors.generic');
  }
  return t('auth.errors.generic');
}

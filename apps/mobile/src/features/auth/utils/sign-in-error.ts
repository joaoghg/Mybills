import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

export function translateSignInError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return t('auth.errors.validation');
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('auth.errors.network');
    }
    if (error.code === 'auth.invalid_credentials') {
      return t('auth.errors.invalidCredentials');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('auth.errors.validation');
    }
    return error.message ? error.message : t('auth.errors.signInGeneric');
  }
  return t('auth.errors.signInGeneric');
}

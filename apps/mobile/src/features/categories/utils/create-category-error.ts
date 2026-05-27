import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

import { translateCreateCategoryZodError } from './create-category-validation';

export function translateCreateCategoryError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return translateCreateCategoryZodError(t, error);
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('categories.errors.network');
    }
    if (error.statusCode === 409 || error.code === 'categories.category_already_exists') {
      return t('categories.errors.alreadyExists');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('categories.errors.validation');
    }
    return error.message ? error.message : t('categories.errors.generic');
  }
  return t('categories.errors.generic');
}

import { ApiClientError } from '@mybills/api-client';
import type { TFunction } from 'i18next';
import { ZodError } from 'zod';

import { translateCreateTransferZodError } from './create-transfer-validation';

export function translateCreateTransferError(error: unknown, t: TFunction): string {
  if (error instanceof ZodError) {
    return translateCreateTransferZodError(t, error);
  }
  if (error instanceof ApiClientError) {
    if (error.statusCode === 0 || error.code === 'client.network_error') {
      return t('transfers.errors.network');
    }
    if (error.code === 'accounts.insufficient_balance') {
      return t('transfers.errors.insufficientBalance');
    }
    if (error.code === 'accounts.source_and_destination_must_differ') {
      return t('transfers.validation.accountsMustDiffer');
    }
    if (error.code === 'transactions.transfer_failed') {
      return t('transfers.errors.transferFailed');
    }
    if (error.statusCode === 400) {
      return error.message ? error.message : t('transfers.errors.validation');
    }
    return error.message ? error.message : t('transfers.errors.generic');
  }
  return t('transfers.errors.generic');
}

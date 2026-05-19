import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

function messageForIssue(
  issue: ZodError['issues'][number],
  t: TFunction
): string | null {
  const field = issue.path[0];
  if (field === 'name' && issue.code === 'too_small') {
    return t('accounts.validation.nameRequired');
  }
  if (field === 'balance') {
    return t('accounts.validation.balanceInvalid');
  }
  return null;
}

export function translateCreateAccountZodError(t: TFunction, error: ZodError): string {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const msg = messageForIssue(issue, t);
    if (msg && !messages.includes(msg)) {
      messages.push(msg);
    }
  }
  if (messages.length === 0) {
    return t('accounts.errors.validation');
  }
  return messages.join('\n');
}

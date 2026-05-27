import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

function messageForIssue(
  issue: ZodError['issues'][number],
  t: TFunction
): string | null {
  const field = issue.path[0];
  if (field === 'name' && issue.code === 'too_small') {
    return t('creditCards.validation.nameRequired');
  }
  if (field === 'limit') {
    return t('creditCards.validation.limitInvalid');
  }
  if (field === 'closingDay') {
    return t('creditCards.validation.closingDayInvalid');
  }
  if (field === 'dueDay') {
    return t('creditCards.validation.dueDayInvalid');
  }
  return null;
}

export function translateCreateCreditCardZodError(t: TFunction, error: ZodError): string {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const msg = messageForIssue(issue, t);
    if (msg && !messages.includes(msg)) {
      messages.push(msg);
    }
  }
  if (messages.length === 0) {
    return t('creditCards.errors.validation');
  }
  return messages.join('\n');
}

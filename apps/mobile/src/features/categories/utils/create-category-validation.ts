import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

function messageForIssue(
  issue: ZodError['issues'][number],
  t: TFunction
): string | null {
  const field = issue.path[0];
  if (field === 'name' && issue.code === 'too_small') {
    return t('categories.validation.nameRequired');
  }
  if (field === 'icon') {
    return t('categories.validation.iconRequired');
  }
  return null;
}

export function translateCreateCategoryZodError(t: TFunction, error: ZodError): string {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const msg = messageForIssue(issue, t);
    if (msg && !messages.includes(msg)) {
      messages.push(msg);
    }
  }
  if (messages.length === 0) {
    return t('categories.errors.validation');
  }
  return messages.join('\n');
}

import type { TFunction } from 'i18next';
import type { ZodError } from 'zod';

function messageForIssue(
  issue: ZodError['issues'][number],
  t: TFunction
): string | null {
  const field = issue.path[0];
  if (field === 'name' && issue.code === 'too_small') {
    return t('auth.validation.nameRequired');
  }
  if (field === 'email' && issue.code === 'invalid_format') {
    if ('format' in issue && issue.format === 'email') {
      return t('auth.validation.emailInvalid');
    }
  }
  if (field === 'password' && issue.code === 'invalid_format') {
    if ('format' in issue && issue.format === 'regex') {
      return t('auth.validation.passwordRequirements');
    }
  }
  return null;
}

export function translateSignUpZodError(t: TFunction, error: ZodError): string {
  const messages: string[] = [];
  for (const issue of error.issues) {
    const msg = messageForIssue(issue, t);
    if (msg && !messages.includes(msg)) {
      messages.push(msg);
    }
  }
  if (messages.length === 0) {
    return t('auth.errors.validation');
  }
  return messages.join('\n');
}

import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import z, { ZodType, flattenError } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    const language = I18nContext.current()?.lang;
    const localeError = this.getLocaleError(language);
    const result = this.schema.safeParse(value, {
      error: localeError
    });

    if (result.success) {
      return result.data;
    }

    throw new BadRequestException({
      message: result.error.issues[0]?.message ?? 'Validation failed',
      errors: flattenError(result.error)
    });
  }

  private getLocaleError(language?: string) {
    if (language?.toLowerCase().startsWith('pt')) {
      return z.locales.pt().localeError;
    }

    return z.locales.en().localeError;
  }
}

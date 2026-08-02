import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const i18nContext = I18nContext.current(host);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let i18nKey = 'errors.database.generic';
    let i18nArgs: Record<string, string | number | boolean> | undefined;
    let fallbackMessage = 'Database error';

    switch (exception.code) {
      case 'P2002': {
        statusCode = HttpStatus.CONFLICT;
        const target = exception.meta?.target as string[];
        const fields = target ? target.join(', ') : 'unknown';
        i18nKey = 'errors.database.conflict';
        i18nArgs = { fields };
        fallbackMessage = `Data conflict: the record already exists (field: ${fields})`;
        break;
      }
      case 'P2025': {
        statusCode = HttpStatus.NOT_FOUND;
        i18nKey = 'errors.database.record_not_found';
        fallbackMessage = 'Record not found in database.';
        break;
      }
      case 'P2003': {
        statusCode = HttpStatus.BAD_REQUEST;
        const field_name = exception.meta?.field_name as string;
        const fieldName = field_name || 'unknown';
        i18nKey = 'errors.database.foreign_key_constraint';
        i18nArgs = { field: fieldName };
        fallbackMessage = `Foreign key constraint failure on field: ${fieldName}`;
        break;
      }
      default:
        i18nKey = 'errors.database.with_code';
        i18nArgs = { code: exception.code };
        fallbackMessage = `Database error (Code: ${exception.code})`;
        break;
    }

    const translatedMessage = this.i18n.translate(i18nKey, {
      lang: i18nContext?.lang,
      args: i18nArgs,
      defaultValue: fallbackMessage
    });

    response.status(statusCode).json({
      statusCode,
      message: translatedMessage,
      code: `database.${exception.code.toLowerCase()}`,
      error: exception.name
    });
  }
}

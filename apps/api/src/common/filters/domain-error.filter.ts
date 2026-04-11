import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { InvalidArgumentError } from '../errors/invalid-argument.error';
import { AlreadyExistsError } from '../errors/already-exists.error';
import { NotFoundError } from '../errors/not-found.error';
import { UnauthorizedError } from '../errors/unauthorized.error';
import { DomainError } from '../errors/domain-error';

@Catch(InvalidArgumentError, AlreadyExistsError, NotFoundError, UnauthorizedError)
export class DomainErrorFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) {}

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const i18nContext = I18nContext.current(host);

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof InvalidArgumentError) {
      statusCode = HttpStatus.BAD_REQUEST;
    } else if (exception instanceof AlreadyExistsError) {
      statusCode = HttpStatus.CONFLICT;
    } else if (exception instanceof NotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
    } else if (exception instanceof UnauthorizedError) {
      statusCode = HttpStatus.UNAUTHORIZED;
    }

    const domainError = exception instanceof DomainError ? exception : undefined;

    const i18nKey =
      domainError?.i18nKey ??
      (exception.message.startsWith('errors.') ? exception.message : undefined);

    const translatedMessage = i18nKey
      ? this.i18n.translate(i18nKey, {
          lang: i18nContext?.lang,
          args: domainError?.i18nArgs,
          defaultValue: exception.message
        })
      : exception.message;

    response.status(statusCode).json({
      statusCode,
      message: translatedMessage,
      code: domainError?.code ?? exception.name ?? 'internal_server_error',
      error: exception.name || 'internal_server_error'
    });
  }
}

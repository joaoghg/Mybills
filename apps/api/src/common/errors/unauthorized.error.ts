import { DomainError, DomainErrorParams } from './domain-error';

export class UnauthorizedError extends DomainError {
  constructor(params?: DomainErrorParams | string) {
    super('unauthorized', params ?? 'Unauthorized');
  }
}

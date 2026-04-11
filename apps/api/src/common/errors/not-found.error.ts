import { DomainError, DomainErrorParams } from './domain-error';

export class NotFoundError extends DomainError {
  constructor(params?: DomainErrorParams | string) {
    super('not_found', params);
  }
}

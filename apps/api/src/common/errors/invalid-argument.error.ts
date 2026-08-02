import { DomainError, DomainErrorParams } from './domain-error';

export class InvalidArgumentError extends DomainError {
  constructor(params?: DomainErrorParams | string) {
    super('invalid_argument', params);
  }
}

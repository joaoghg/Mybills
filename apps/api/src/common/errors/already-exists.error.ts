import { DomainError, DomainErrorParams } from './domain-error';

export class AlreadyExistsError extends DomainError {
  constructor(params?: DomainErrorParams | string) {
    super('already_exists', params);
  }
}

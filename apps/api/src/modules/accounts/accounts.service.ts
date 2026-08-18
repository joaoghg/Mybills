import { Inject, Injectable } from '@nestjs/common';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { CreateAccountData } from './contracts/create-account-data.contract';
import { UpdateAccountData } from './contracts/update-account-data.contract';
import { Account } from './entities/account.entity';
import { AccountRepository } from './repositories/account.repository';

@Injectable()
export class AccountsService {
  constructor(@Inject('AccountRepository') private readonly repository: AccountRepository) {}

  async findAll(userId: string): Promise<Account[]> {
    this.validateUserId(userId);

    return await this.repository.findAllByUserId(userId);
  }

  async findById(accountId: string, userId: string): Promise<Account> {
    this.validateAccountId(accountId);
    this.validateUserId(userId);

    const account = await this.repository.findByIdAndUserId(accountId, userId);

    if (!account) {
      throw new NotFoundError({
        code: 'accounts.account_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'account' }
      });
    }

    return account;
  }

  async accountExistsForUser(accountId: string, userId: string): Promise<boolean> {
    this.validateAccountId(accountId);
    this.validateUserId(userId);

    const account = await this.repository.findByIdAndUserId(accountId, userId);

    return account !== null;
  }

  async create(data: CreateAccountData): Promise<Account> {
    this.validateCreateData(data);

    return await this.repository.create(data);
  }

  async update(accountId: string, userId: string, data: UpdateAccountData): Promise<Account> {
    this.validateAccountId(accountId);
    this.validateUserId(userId);
    this.validateUpdateData(data);

    const current = await this.findById(accountId, userId);
    if (current.source === 'PLUGGY') {
      const overridden = new Set(current.overriddenFields);
      if (data.name !== undefined) {
        overridden.add('name');
      }
      if (data.balance !== undefined) {
        overridden.add('balance');
      }

      return await this.repository.update(accountId, {
        ...data,
        overriddenFields: [...overridden]
      });
    }

    return await this.repository.update(accountId, data);
  }

  async remove(accountId: string, userId: string): Promise<void> {
    this.validateAccountId(accountId);
    this.validateUserId(userId);

    const account = await this.findById(accountId, userId);
    if (account.source === 'PLUGGY') {
      await this.repository.hide(accountId);
      return;
    }

    await this.repository.delete(accountId);
  }

  private validateCreateData(data: CreateAccountData): void {
    this.validateUserId(data.userId);

    if (!data.name || typeof data.name !== 'string') {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_account_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_name' }
      });
    }

    if (!Number.isInteger(data.balance)) {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_account_balance',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_balance' }
      });
    }
  }

  private validateUpdateData(data: UpdateAccountData): void {
    if (data.name === undefined && data.balance === undefined) {
      throw new InvalidArgumentError({
        code: 'accounts.at_least_one_field_required',
        i18nKey: 'errors.validation.at_least_one_field_required'
      });
    }

    if (data.name !== undefined && (!data.name || typeof data.name !== 'string')) {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_account_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_name' }
      });
    }

    if (data.balance !== undefined && !Number.isInteger(data.balance)) {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_account_balance',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_balance' }
      });
    }
  }

  private validateAccountId(accountId: string): void {
    if (!accountId || typeof accountId !== 'string') {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_account_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_id' }
      });
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_user_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_id' }
      });
    }
  }
}

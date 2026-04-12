import { Inject, Injectable } from '@nestjs/common';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { CreateAccountData } from './contracts/create-account-data.contract';
import { TransferBalanceData } from './contracts/transfer-balance-data.contract';
import { TransferBalanceResult } from './contracts/transfer-balance-result.contract';
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

  async transferBalance(data: TransferBalanceData): Promise<TransferBalanceResult> {
    this.validateTransferData(data);

    const sourceAccount = await this.repository.findByIdAndUserId(data.sourceAccountId, data.userId);

    if (!sourceAccount) {
      throw new NotFoundError({
        code: 'accounts.source_account_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'source_account' }
      });
    }

    const destinationAccount = await this.repository.findByIdAndUserId(
      data.destinationAccountId,
      data.userId
    );

    if (!destinationAccount) {
      throw new NotFoundError({
        code: 'accounts.destination_account_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'destination_account' }
      });
    }

    if (sourceAccount.balance < data.amount) {
      throw new InvalidArgumentError({
        code: 'accounts.insufficient_balance',
        i18nKey: 'errors.accounts.insufficient_balance'
      });
    }

    const transferResult = await this.repository.transferBalance(data);

    if (!transferResult) {
      throw new InvalidArgumentError({
        code: 'accounts.transfer_failed',
        i18nKey: 'errors.accounts.transfer_failed'
      });
    }

    return transferResult;
  }

  async update(accountId: string, userId: string, data: UpdateAccountData): Promise<Account> {
    this.validateAccountId(accountId);
    this.validateUserId(userId);
    this.validateUpdateData(data);

    await this.findById(accountId, userId);

    return await this.repository.update(accountId, data);
  }

  async remove(accountId: string, userId: string): Promise<void> {
    this.validateAccountId(accountId);
    this.validateUserId(userId);

    await this.findById(accountId, userId);
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

  private validateTransferData(data: TransferBalanceData): void {
    this.validateUserId(data.userId);
    this.validateAccountId(data.sourceAccountId);
    this.validateAccountId(data.destinationAccountId);

    if (data.sourceAccountId === data.destinationAccountId) {
      throw new InvalidArgumentError({
        code: 'accounts.source_and_destination_must_differ',
        i18nKey: 'errors.validation.source_and_destination_must_differ'
      });
    }

    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw new InvalidArgumentError({
        code: 'accounts.invalid_transfer_amount',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transfer_amount' }
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

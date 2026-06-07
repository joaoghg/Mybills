import type { ListTransactionsQueryInput } from '@mybills/dtos';
import { Inject, Injectable } from '@nestjs/common';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { TransactionType } from 'src/generated/prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { CreateTransactionData } from './contracts/create-transaction-data.contract';
import { UpdateTransactionData } from './contracts/update-transaction-data.contract';
import { Transaction } from './entities/transaction.entity';
import { TransactionRepository } from './repositories/transaction.repository';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('TransactionRepository') private readonly repository: TransactionRepository,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly creditCardsService: CreditCardsService
  ) {}

  async findAll(userId: string, filters?: ListTransactionsQueryInput): Promise<Transaction[]> {
    this.validateUserId(userId);

    if (filters?.categoryId !== undefined) {
      await this.categoriesService.findById(filters.categoryId, userId);
    }

    return await this.repository.findAllByUserId(userId, filters);
  }

  async findById(transactionId: string, userId: string): Promise<Transaction> {
    this.validateTransactionId(transactionId);
    this.validateUserId(userId);

    const transaction = await this.repository.findByIdAndUserId(transactionId, userId);

    if (!transaction) {
      throw new NotFoundError({
        code: 'transactions.transaction_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'transaction' }
      });
    }

    return transaction;
  }

  async create(data: CreateTransactionData): Promise<Transaction> {
    this.validateCreateData(data);
    await this.validateRelations(
      data.userId,
      data.type,
      data.accountId,
      data.categoryId,
      data.cardId
    );

    const transaction = await this.repository.create(data);

    if (transaction.isPaid && transaction.accountId) {
      await this.applyBalanceImpact(
        transaction.accountId,
        transaction.userId,
        transaction.type,
        transaction.amount
      );
    }

    return transaction;
  }

  async update(
    transactionId: string,
    userId: string,
    data: UpdateTransactionData
  ): Promise<Transaction> {
    this.validateTransactionId(transactionId);
    this.validateUserId(userId);
    this.validateUpdateData(data);

    const currentTransaction = await this.findById(transactionId, userId);

    const nextAccountId =
      data.accountId === undefined ? currentTransaction.accountId : data.accountId;
    const nextCategoryId =
      data.categoryId === undefined ? currentTransaction.categoryId : data.categoryId;
    const nextCardId = data.cardId === undefined ? currentTransaction.cardId : data.cardId;

    const nextType = data.type === undefined ? currentTransaction.type : data.type;

    await this.validateRelations(
      userId,
      nextType,
      nextAccountId,
      nextCategoryId,
      nextCardId
    );

    const updatedTransaction = await this.repository.update(transactionId, data);

    if (currentTransaction.isPaid && currentTransaction.accountId) {
      await this.applyBalanceImpact(
        currentTransaction.accountId,
        userId,
        currentTransaction.type,
        -currentTransaction.amount
      );
    }

    if (updatedTransaction.isPaid && updatedTransaction.accountId) {
      await this.applyBalanceImpact(
        updatedTransaction.accountId,
        userId,
        updatedTransaction.type,
        updatedTransaction.amount
      );
    }

    return updatedTransaction;
  }

  async updateIsPaid(transactionId: string, userId: string, isPaid: boolean): Promise<Transaction> {
    this.validateTransactionId(transactionId);
    this.validateUserId(userId);

    if (typeof isPaid !== 'boolean') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_is_paid',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'is_paid' }
      });
    }

    const currentTransaction = await this.findById(transactionId, userId);

    if (currentTransaction.isPaid === isPaid) {
      return currentTransaction;
    }

    const updatedTransaction = await this.repository.updateIsPaid(transactionId, isPaid);

    if (updatedTransaction.accountId) {
      const signedAmount = isPaid ? updatedTransaction.amount : -updatedTransaction.amount;

      await this.applyBalanceImpact(
        updatedTransaction.accountId,
        userId,
        updatedTransaction.type,
        signedAmount
      );
    }

    return updatedTransaction;
  }

  async remove(transactionId: string, userId: string): Promise<void> {
    this.validateTransactionId(transactionId);
    this.validateUserId(userId);

    const transaction = await this.findById(transactionId, userId);

    if (transaction.isPaid && transaction.accountId) {
      await this.applyBalanceImpact(
        transaction.accountId,
        userId,
        transaction.type,
        -transaction.amount
      );
    }

    await this.repository.delete(transactionId);
  }

  private async validateRelations(
    userId: string,
    transactionType: TransactionType,
    accountId?: string | null,
    categoryId?: string | null,
    cardId?: string | null
  ): Promise<void> {
    if (accountId !== undefined && accountId !== null) {
      const accountExists = await this.accountsService.accountExistsForUser(accountId, userId);

      if (!accountExists) {
        throw new NotFoundError({
          code: 'transactions.account_not_found',
          i18nKey: 'errors.not_found.resource',
          i18nArgs: { resource: 'account' }
        });
      }
    }

    if (categoryId !== undefined && categoryId !== null) {
      if (transactionType === TransactionType.TRANSFER) {
        throw new InvalidArgumentError({
          code: 'transactions.category_not_allowed_for_transfer',
          i18nKey: 'errors.transactions.category_not_allowed_for_transfer'
        });
      }

      const category = await this.categoriesService.findById(categoryId, userId);

      if (
        (transactionType === TransactionType.INCOME || transactionType === TransactionType.EXPENSE) &&
        !category.types.includes(transactionType)
      ) {
        throw new InvalidArgumentError({
          code: 'transactions.category_type_mismatch',
          i18nKey: 'errors.transactions.category_type_mismatch'
        });
      }
    }

    if (cardId !== undefined && cardId !== null) {
      await this.creditCardsService.findById(cardId, userId);
    }
  }

  private async applyBalanceImpact(
    accountId: string,
    userId: string,
    type: TransactionType,
    amount: number
  ): Promise<void> {
    const account = await this.accountsService.findById(accountId, userId);
    const signedAmount = type === TransactionType.INCOME ? amount : -amount;

    await this.accountsService.update(accountId, userId, {
      balance: account.balance + signedAmount
    });
  }

  private validateCreateData(data: CreateTransactionData): void {
    this.validateUserId(data.userId);

    if (data.accountId !== undefined && data.accountId !== null) {
      this.validateAccountId(data.accountId);
    }

    if (data.categoryId !== undefined && data.categoryId !== null) {
      this.validateCategoryId(data.categoryId);

      if (data.type === TransactionType.TRANSFER) {
        throw new InvalidArgumentError({
          code: 'transactions.category_not_allowed_for_transfer',
          i18nKey: 'errors.transactions.category_not_allowed_for_transfer'
        });
      }
    }

    if (data.cardId !== undefined && data.cardId !== null) {
      this.validateCardId(data.cardId);
    }

    if (
      data.description !== undefined &&
      data.description !== null &&
      typeof data.description !== 'string'
    ) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_description',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_description' }
      });
    }

    if (!Object.values(TransactionType).includes(data.type)) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_type',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_type' }
      });
    }

    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_amount',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_amount' }
      });
    }

    if (!data.date || Number.isNaN(new Date(data.date).getTime())) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_date',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_date' }
      });
    }

    if (typeof data.isPaid !== 'boolean') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_is_paid',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'is_paid' }
      });
    }
  }

  private validateUpdateData(data: UpdateTransactionData): void {
    if (
      data.accountId === undefined &&
      data.categoryId === undefined &&
      data.cardId === undefined &&
      data.description === undefined &&
      data.type === undefined &&
      data.amount === undefined &&
      data.date === undefined
    ) {
      throw new InvalidArgumentError({
        code: 'transactions.at_least_one_field_required',
        i18nKey: 'errors.validation.at_least_one_field_required'
      });
    }

    if (data.accountId !== undefined && data.accountId !== null) {
      this.validateAccountId(data.accountId);
    }

    if (data.categoryId !== undefined && data.categoryId !== null) {
      this.validateCategoryId(data.categoryId);
    }

    if (data.cardId !== undefined && data.cardId !== null) {
      this.validateCardId(data.cardId);
    }

    if (
      data.description !== undefined &&
      data.description !== null &&
      typeof data.description !== 'string'
    ) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_description',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_description' }
      });
    }

    if (data.type !== undefined && !Object.values(TransactionType).includes(data.type)) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_type',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_type' }
      });
    }

    if (data.amount !== undefined && (!Number.isInteger(data.amount) || data.amount <= 0)) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_amount',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_amount' }
      });
    }

    if (data.date !== undefined && Number.isNaN(new Date(data.date).getTime())) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_date',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_date' }
      });
    }
  }

  private validateTransactionId(transactionId: string): void {
    if (!transactionId || typeof transactionId !== 'string') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transaction_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transaction_id' }
      });
    }
  }

  private validateAccountId(accountId: string): void {
    if (!accountId || typeof accountId !== 'string') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_account_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_id' }
      });
    }
  }

  private validateCategoryId(categoryId: string): void {
    if (!categoryId || typeof categoryId !== 'string') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_category_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'category_id' }
      });
    }
  }

  private validateCardId(cardId: string): void {
    if (!cardId || typeof cardId !== 'string') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_credit_card_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_id' }
      });
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_user_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_id' }
      });
    }
  }
}

import { Inject, Injectable } from '@nestjs/common';
import type { PayCreditCardInvoiceInput, PayCreditCardInvoiceOutput } from '@mybills/dtos';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { AccountsService } from '../accounts/accounts.service';
import { CreateCreditCardData } from './contracts/create-credit-card-data.contract';
import { UpdateCreditCardData } from './contracts/update-credit-card-data.contract';
import { CreditCard } from './entities/credit-card.entity';
import {
  canPayBillingCycle,
  getClosedBillingCycleRange,
  utcTodayYmd
} from './lib/billing-cycle';
import { CreditCardRepository } from './repositories/credit-card.repository';

const INVOICE_PAYMENT_DESCRIPTION = 'Invoice payment';

@Injectable()
export class CreditCardsService {
  constructor(
    @Inject('CreditCardRepository') private readonly repository: CreditCardRepository,
    private readonly accountsService: AccountsService
  ) {}

  async findAll(userId: string): Promise<CreditCard[]> {
    this.validateUserId(userId);

    return await this.repository.findAllByUserId(userId);
  }

  async findById(creditCardId: string, userId: string): Promise<CreditCard> {
    this.validateCreditCardId(creditCardId);
    this.validateUserId(userId);

    const creditCard = await this.repository.findByIdAndUserId(creditCardId, userId);

    if (!creditCard) {
      throw new NotFoundError({
        code: 'credit_cards.credit_card_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'credit_card' }
      });
    }

    return creditCard;
  }

  async create(data: CreateCreditCardData): Promise<CreditCard> {
    this.validateCreateData(data);

    if (data.accountId !== undefined && data.accountId !== null) {
      const accountExists = await this.accountsService.accountExistsForUser(
        data.accountId,
        data.userId
      );

      if (!accountExists) {
        throw new NotFoundError({
          code: 'credit_cards.account_not_found',
          i18nKey: 'errors.not_found.resource',
          i18nArgs: { resource: 'account' }
        });
      }
    }

    return await this.repository.create(data);
  }

  async update(
    creditCardId: string,
    userId: string,
    data: UpdateCreditCardData
  ): Promise<CreditCard> {
    this.validateCreditCardId(creditCardId);
    this.validateUserId(userId);
    this.validateUpdateData(data);

    await this.findById(creditCardId, userId);

    if (data.accountId !== undefined && data.accountId !== null) {
      const accountExists = await this.accountsService.accountExistsForUser(data.accountId, userId);

      if (!accountExists) {
        throw new NotFoundError({
          code: 'credit_cards.account_not_found',
          i18nKey: 'errors.not_found.resource',
          i18nArgs: { resource: 'account' }
        });
      }
    }

    return await this.repository.update(creditCardId, {
      accountId: data.accountId,
      name: data.name,
      limit: data.limit,
      closingDay: data.closingDay,
      dueDay: data.dueDay
    });
  }

  async remove(creditCardId: string, userId: string): Promise<void> {
    this.validateCreditCardId(creditCardId);
    this.validateUserId(userId);

    await this.findById(creditCardId, userId);
    await this.repository.delete(creditCardId);
  }

  async payInvoice(
    creditCardId: string,
    userId: string,
    input: PayCreditCardInvoiceInput,
    now: Date = new Date()
  ): Promise<PayCreditCardInvoiceOutput> {
    this.validateCreditCardId(creditCardId);
    this.validateUserId(userId);

    if (input.accountId !== undefined) {
      this.validateAccountId(input.accountId);
    }

    const creditCard = await this.findById(creditCardId, userId);
    const accountId = input.accountId ?? creditCard.accountId ?? null;

    if (!accountId) {
      throw new InvalidArgumentError({
        code: 'credit_cards.account_required',
        i18nKey: 'errors.credit_cards.account_required'
      });
    }

    const accountExists = await this.accountsService.accountExistsForUser(accountId, userId);

    if (!accountExists) {
      throw new NotFoundError({
        code: 'credit_cards.account_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'account' }
      });
    }

    const cycle = getClosedBillingCycleRange(creditCard.closingDay, input.cycleEnd);

    if (!cycle) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_cycle_end',
        i18nKey: 'errors.credit_cards.invalid_cycle_end'
      });
    }

    const todayYmd = utcTodayYmd(now);

    if (!canPayBillingCycle(input.cycleEnd, todayYmd)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invoice_not_closed',
        i18nKey: 'errors.credit_cards.invoice_not_closed'
      });
    }

    const result = await this.repository.payInvoice({
      userId,
      creditCardId,
      accountId,
      cycleStart: cycle.start,
      cycleEnd: cycle.end,
      paymentDate: todayYmd,
      description: INVOICE_PAYMENT_DESCRIPTION
    });

    if (!result) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invoice_empty',
        i18nKey: 'errors.credit_cards.invoice_empty'
      });
    }

    return result;
  }

  private validateCreateData(data: CreateCreditCardData): void {
    this.validateUserId(data.userId);

    if (data.accountId !== undefined && data.accountId !== null) {
      this.validateAccountId(data.accountId);
    }

    if (!data.name || typeof data.name !== 'string') {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_name' }
      });
    }

    if (!Number.isInteger(data.limit)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_limit',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_limit' }
      });
    }

    if (!Number.isInteger(data.closingDay)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_closing_day',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_closing_day' }
      });
    }

    if (!Number.isInteger(data.dueDay)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_due_day',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_due_day' }
      });
    }
  }

  private validateUpdateData(data: UpdateCreditCardData): void {
    if (
      data.accountId === undefined &&
      data.name === undefined &&
      data.limit === undefined &&
      data.closingDay === undefined &&
      data.dueDay === undefined
    ) {
      throw new InvalidArgumentError({
        code: 'credit_cards.at_least_one_field_required',
        i18nKey: 'errors.validation.at_least_one_field_required'
      });
    }

    if (data.accountId !== undefined && data.accountId !== null) {
      this.validateAccountId(data.accountId);
    }

    if (data.name !== undefined && (!data.name || typeof data.name !== 'string')) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_name' }
      });
    }

    if (data.limit !== undefined && !Number.isInteger(data.limit)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_limit',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_limit' }
      });
    }

    if (data.closingDay !== undefined && !Number.isInteger(data.closingDay)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_closing_day',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_closing_day' }
      });
    }

    if (data.dueDay !== undefined && !Number.isInteger(data.dueDay)) {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_due_day',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_due_day' }
      });
    }
  }

  private validateCreditCardId(creditCardId: string): void {
    if (!creditCardId || typeof creditCardId !== 'string') {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_credit_card_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'credit_card_id' }
      });
    }
  }

  private validateAccountId(accountId: string): void {
    if (!accountId || typeof accountId !== 'string') {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_account_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'account_id' }
      });
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new InvalidArgumentError({
        code: 'credit_cards.invalid_user_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_id' }
      });
    }
  }
}

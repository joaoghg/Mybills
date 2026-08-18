import { randomUUID } from 'crypto';
import type {
  ListTransactionsQueryInput,
  MonthlySummaryCardInvoice,
  MonthlySummaryOutput,
  MonthlySummaryQueryInput
} from '@mybills/dtos';
import { Inject, Injectable } from '@nestjs/common';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { TransactionSeriesType, TransactionType } from 'src/generated/prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { CategoriesService } from '../categories/categories.service';
import { CreditCardsService } from '../credit-cards/credit-cards.service';
import { CreateTransactionData } from './contracts/create-transaction-data.contract';
import { CreateTransferInputData } from './contracts/create-transfer-input-data.contract';
import { CreateTransferResult } from './contracts/create-transfer-data.contract';
import { UpdateTransferData } from './contracts/update-transfer-data.contract';
import {
  UpdateTransactionData,
  type TransactionSeriesScope
} from './contracts/update-transaction-data.contract';
import { Transaction } from './entities/transaction.entity';
import {
  generateInstallmentOccurrencesByCount,
  OccurrenceDraft,
  parseYmd,
  utcTodayYmd
} from './lib/monthly-schedule';
import { formatYearMonth } from '../credit-cards/lib/billing-cycle';
import { TransactionRepository } from './repositories/transaction.repository';
import { TransactionSeriesMaintenanceService } from './transaction-series-maintenance.service';

/** Widest gap between a card purchase date and its invoice payment month. */
const SUMMARY_LOOKBACK_MONTHS = 2;
/** Widest gap between income occurrence date and an earlier competence month. */
const SUMMARY_LOOKAHEAD_MONTHS = 2;

@Injectable()
export class TransactionsService {
  constructor(
    @Inject('TransactionRepository') private readonly repository: TransactionRepository,
    private readonly accountsService: AccountsService,
    private readonly categoriesService: CategoriesService,
    private readonly creditCardsService: CreditCardsService,
    private readonly seriesMaintenance: TransactionSeriesMaintenanceService
  ) {}

  async findAll(userId: string, filters?: ListTransactionsQueryInput): Promise<Transaction[]> {
    this.validateUserId(userId);

    if (filters?.categoryId !== undefined) {
      await this.categoriesService.findById(filters.categoryId, userId);
    }

    return await this.repository.findAllByUserId(userId, filters);
  }

  async getMonthlySummary(
    userId: string,
    query: MonthlySummaryQueryInput
  ): Promise<MonthlySummaryOutput> {
    this.validateUserId(userId);

    const month = formatYearMonth({ year: query.year, month: query.month });
    const { from, to } = this.buildSummaryWindow(query.year, query.month);

    const transactions = await this.repository.findAllByUserId(userId, {
      from,
      to,
      includeTransfer: false
    });

    const income: Transaction[] = [];
    const expenses: Transaction[] = [];
    const cardTransactions: Transaction[] = [];

    for (const transaction of transactions) {
      if (transaction.cardId) {
        if (transaction.invoicePaymentMonth === month) {
          cardTransactions.push(transaction);
        }
        continue;
      }

      if (this.cashFlowYearMonth(transaction) !== month) {
        continue;
      }

      if (transaction.type === TransactionType.INCOME) {
        income.push(transaction);
      } else if (transaction.type === TransactionType.EXPENSE) {
        expenses.push(transaction);
      }
    }

    const cardInvoices = await this.buildCardInvoices(userId, month, cardTransactions);

    const incomeTotal = income.reduce((total, transaction) => total + transaction.amount, 0);
    const expenseTotal =
      expenses.reduce((total, transaction) => total + transaction.amount, 0) +
      cardInvoices.reduce((total, invoice) => total + invoice.total, 0);

    return {
      month,
      incomeTotal,
      expenseTotal,
      netTotal: incomeTotal - expenseTotal,
      income,
      expenses,
      cardInvoices
    };
  }

  private buildSummaryWindow(year: number, month: number): { from: string; to: string } {
    const startIndex = year * 12 + (month - 1) - SUMMARY_LOOKBACK_MONTHS;
    const startYear = Math.floor(startIndex / 12);
    const startMonth = (startIndex % 12) + 1;
    const endIndex = year * 12 + (month - 1) + SUMMARY_LOOKAHEAD_MONTHS;
    const endYear = Math.floor(endIndex / 12);
    const endMonth = (endIndex % 12) + 1;
    const lastDay = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();

    return {
      from: `${formatYearMonth({ year: startYear, month: startMonth })}-01`,
      to: `${formatYearMonth({ year: endYear, month: endMonth })}-${String(lastDay).padStart(2, '0')}`
    };
  }

  private cashFlowYearMonth(transaction: Transaction): string {
    if (transaction.type === TransactionType.INCOME) {
      return (transaction.competenceDate ?? transaction.date).slice(0, 7);
    }

    return transaction.date.slice(0, 7);
  }

  private yearMonthOf(isoOrYmd: string): string {
    return isoOrYmd.slice(0, 7);
  }

  private normalizeCompetenceDate(
    dateYmd: string,
    competenceDate: string | null | undefined
  ): string | null {
    if (!competenceDate) {
      return null;
    }

    const competenceYmd = competenceDate.slice(0, 10);

    if (this.yearMonthOf(competenceYmd) === this.yearMonthOf(dateYmd)) {
      return null;
    }

    return competenceYmd;
  }

  private assertCompetenceAllowed(params: {
    type: TransactionType;
    competenceDate: string | null | undefined;
    scheduleMode?: 'NONE' | 'INSTALLMENT' | 'RECURRING';
    scope?: TransactionSeriesScope;
  }): void {
    if (!params.competenceDate) {
      return;
    }

    if (params.type !== TransactionType.INCOME) {
      throw new InvalidArgumentError({
        code: 'transactions.competence_date_income_only',
        i18nKey: 'errors.transactions.competence_date_income_only'
      });
    }

    if (params.scheduleMode !== undefined && params.scheduleMode !== 'NONE') {
      throw new InvalidArgumentError({
        code: 'transactions.competence_date_schedule_not_allowed',
        i18nKey: 'errors.transactions.competence_date_schedule_not_allowed'
      });
    }

    if (params.scope === 'THIS_AND_FUTURE') {
      throw new InvalidArgumentError({
        code: 'transactions.competence_date_single_scope_only',
        i18nKey: 'errors.transactions.competence_date_single_scope_only'
      });
    }
  }

  private async buildCardInvoices(
    userId: string,
    paymentMonth: string,
    cardTransactions: Transaction[]
  ): Promise<MonthlySummaryCardInvoice[]> {
    if (cardTransactions.length === 0) {
      return [];
    }

    const cards = await this.creditCardsService.findAll(userId);
    const cardNameById = new Map(cards.map((card) => [card.id, card.name]));
    const grouped = new Map<string, Transaction[]>();

    for (const transaction of cardTransactions) {
      const cardId = transaction.cardId;

      if (!cardId) {
        continue;
      }

      const group = grouped.get(cardId);

      if (group) {
        group.push(transaction);
      } else {
        grouped.set(cardId, [transaction]);
      }
    }

    const invoices: MonthlySummaryCardInvoice[] = [];

    for (const [cardId, group] of grouped) {
      const total = group.reduce(
        (sum, transaction) =>
          transaction.type === TransactionType.INCOME
            ? sum - transaction.amount
            : sum + transaction.amount,
        0
      );

      invoices.push({
        cardId,
        cardName: cardNameById.get(cardId) ?? '',
        paymentMonth,
        total,
        isFullyPaid: group.every((transaction) => transaction.isPaid),
        transactions: group
      });
    }

    return invoices.sort((a, b) => a.cardName.localeCompare(b.cardName));
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

    const schedule = data.schedule ?? { mode: 'NONE' as const };
    this.assertCompetenceAllowed({
      type: data.type,
      competenceDate: data.competenceDate,
      scheduleMode: schedule.mode
    });

    await this.validateRelations(
      data.userId,
      data.type,
      data.accountId,
      data.categoryId,
      data.cardId
    );

    const createData: CreateTransactionData = {
      ...data,
      competenceDate: this.normalizeCompetenceDate(data.date, data.competenceDate)
    };

    if (schedule.mode === 'NONE') {
      const transaction = await this.repository.create(createData);

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

    if (data.type === TransactionType.TRANSFER) {
      throw new InvalidArgumentError({
        code: 'transactions.schedule_not_allowed_for_transfer',
        i18nKey: 'errors.transactions.schedule_not_allowed_for_transfer'
      });
    }

    const anchorDay = parseYmd(data.date).day;

    if (schedule.mode === 'INSTALLMENT') {
      const drafts = this.buildInstallmentDrafts(data.date, schedule.installments);

      const occurrences = drafts.map((draft, index) => ({
        occurrenceNumber: draft.occurrenceNumber,
        date: draft.date,
        isPaid: index === 0 ? data.isPaid : false,
        isProjected: false
      }));

      const created = await this.repository.createSeriesWithOccurrences({
        userId: data.userId,
        type: TransactionSeriesType.INSTALLMENT,
        accountId: data.accountId,
        categoryId: data.categoryId,
        cardId: data.cardId,
        description: data.description,
        transactionType: data.type,
        amount: data.amount,
        anchorDate: data.date,
        anchorDay,
        totalOccurrences: drafts.length,
        occurrences
      });

      const first = await this.findById(created.firstTransactionId, data.userId);

      if (first.isPaid && first.accountId) {
        await this.applyBalanceImpact(first.accountId, first.userId, first.type, first.amount);
      }

      return first;
    }

    const occurrences = this.seriesMaintenance.buildInitialRecurringOccurrences(
      data.date,
      anchorDay,
      data.isPaid
    );

    const created = await this.repository.createSeriesWithOccurrences({
      userId: data.userId,
      type: TransactionSeriesType.RECURRING,
      accountId: data.accountId,
      categoryId: data.categoryId,
      cardId: data.cardId,
      description: data.description,
      transactionType: data.type,
      amount: data.amount,
      anchorDate: data.date,
      anchorDay,
      totalOccurrences: null,
      occurrences
    });

    const first = await this.findById(created.firstTransactionId, data.userId);

    if (first.isPaid && first.accountId && !first.isProjected) {
      await this.applyBalanceImpact(first.accountId, first.userId, first.type, first.amount);
    }

    return first;
  }

  async createTransfer(
    data: CreateTransferInputData
  ): Promise<CreateTransferResult> {
    this.validateTransferData(data);

    const sourceAccount = await this.findSourceAccountForTransfer(data);
    await this.findDestinationAccountForTransfer(data);

    if (sourceAccount.balance < data.amount) {
      throw new InvalidArgumentError({
        code: 'accounts.insufficient_balance',
        i18nKey: 'errors.accounts.insufficient_balance'
      });
    }

    const transferCategory = await this.categoriesService.ensureDefaultTransferCategory(data.userId);
    const transferGroupId = randomUUID();

    const transferResult = await this.repository.createTransferPair({
      ...data,
      categoryId: transferCategory.id,
      transferGroupId
    });

    if (!transferResult) {
      throw new InvalidArgumentError({
        code: 'transactions.transfer_failed',
        i18nKey: 'errors.transactions.transfer_failed'
      });
    }

    return transferResult;
  }

  async findTransferByGroupId(
    transferGroupId: string,
    userId: string
  ): Promise<CreateTransferResult> {
    this.validateTransferGroupId(transferGroupId);
    this.validateUserId(userId);

    const pair = await this.repository.findByTransferGroupIdAndUserId(transferGroupId, userId);

    if (!pair) {
      throw new NotFoundError({
        code: 'transactions.transfer_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'transfer' }
      });
    }

    return {
      transferGroupId,
      sourceTransaction: pair.sourceTransaction,
      destinationTransaction: pair.destinationTransaction
    };
  }

  async updateTransfer(
    transferGroupId: string,
    userId: string,
    data: Omit<UpdateTransferData, 'userId'>
  ): Promise<CreateTransferResult> {
    this.validateTransferGroupId(transferGroupId);
    this.validateTransferData({ ...data, userId });

    const existing = await this.repository.findByTransferGroupIdAndUserId(transferGroupId, userId);

    if (!existing) {
      throw new NotFoundError({
        code: 'transactions.transfer_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'transfer' }
      });
    }

    await this.findSourceAccountForTransfer({ ...data, userId });
    await this.findDestinationAccountForTransfer({ ...data, userId });

    const sourceAccount = await this.accountsService.findById(data.sourceAccountId, userId);
    const oldSourceAccountId = existing.sourceTransaction.accountId;
    const oldAmount = existing.sourceTransaction.amount;

    const effectiveBalance =
      oldSourceAccountId === data.sourceAccountId
        ? sourceAccount.balance + oldAmount
        : sourceAccount.balance;

    if (effectiveBalance < data.amount) {
      throw new InvalidArgumentError({
        code: 'accounts.insufficient_balance',
        i18nKey: 'errors.accounts.insufficient_balance'
      });
    }

    const transferResult = await this.repository.updateTransferPair(transferGroupId, {
      ...data,
      userId
    });

    if (!transferResult) {
      throw new InvalidArgumentError({
        code: 'transactions.transfer_failed',
        i18nKey: 'errors.transactions.transfer_failed'
      });
    }

    return transferResult;
  }

  private async findSourceAccountForTransfer(data: CreateTransferInputData) {
    try {
      return await this.accountsService.findById(data.sourceAccountId, data.userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError({
          code: 'accounts.source_account_not_found',
          i18nKey: 'errors.not_found.resource',
          i18nArgs: { resource: 'source_account' }
        });
      }

      throw error;
    }
  }

  private async findDestinationAccountForTransfer(data: CreateTransferInputData): Promise<void> {
    try {
      await this.accountsService.findById(data.destinationAccountId, data.userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new NotFoundError({
          code: 'accounts.destination_account_not_found',
          i18nKey: 'errors.not_found.resource',
          i18nArgs: { resource: 'destination_account' }
        });
      }

      throw error;
    }
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

    if (currentTransaction.transferGroupId) {
      throw new InvalidArgumentError({
        code: 'transactions.transfer_edit_not_allowed',
        i18nKey: 'errors.transactions.transfer_edit_not_allowed'
      });
    }

    const schedule = data.schedule;
    const nextAccountId =
      data.accountId === undefined ? currentTransaction.accountId : data.accountId;
    const nextCategoryId =
      data.categoryId === undefined ? currentTransaction.categoryId : data.categoryId;
    const nextCardId = data.cardId === undefined ? currentTransaction.cardId : data.cardId;
    const nextType = data.type === undefined ? currentTransaction.type : data.type;
    const nextAmount = data.amount === undefined ? currentTransaction.amount : data.amount;
    const nextDate =
      data.date === undefined ? currentTransaction.date.slice(0, 10) : data.date;
    const nextDescription =
      data.description === undefined ? currentTransaction.description : data.description;

    const payload: UpdateTransactionData = { ...data };
    const scheduleModeForCompetence =
      schedule?.mode ?? (currentTransaction.seriesId ? undefined : 'NONE');

    if (nextType !== TransactionType.INCOME) {
      if (data.competenceDate) {
        this.assertCompetenceAllowed({
          type: nextType,
          competenceDate: data.competenceDate,
          scheduleMode: scheduleModeForCompetence,
          scope: data.scope ?? 'SINGLE'
        });
      }
      payload.competenceDate = null;
    } else if (payload.competenceDate !== undefined) {
      this.assertCompetenceAllowed({
        type: nextType,
        competenceDate: payload.competenceDate,
        scheduleMode: scheduleModeForCompetence,
        scope: data.scope ?? 'SINGLE'
      });
      payload.competenceDate = this.normalizeCompetenceDate(nextDate, payload.competenceDate);
    }

    await this.validateRelations(userId, nextType, nextAccountId, nextCategoryId, nextCardId);

    if (schedule && schedule.mode !== 'NONE') {
      if (nextType === TransactionType.TRANSFER) {
        throw new InvalidArgumentError({
          code: 'transactions.schedule_not_allowed_for_transfer',
          i18nKey: 'errors.transactions.schedule_not_allowed_for_transfer'
        });
      }

      const currentSeriesType = currentTransaction.seriesType;
      const wantsInstallment = schedule.mode === 'INSTALLMENT';
      const wantsRecurring = schedule.mode === 'RECURRING';
      const sameType =
        (wantsInstallment && currentSeriesType === TransactionSeriesType.INSTALLMENT) ||
        (wantsRecurring && currentSeriesType === TransactionSeriesType.RECURRING);

      if (!sameType) {
        if (!currentTransaction.seriesId) {
          return await this.promoteStandaloneToSeries(currentTransaction, {
            accountId: nextAccountId,
            categoryId: nextCategoryId,
            cardId: nextCardId,
            description: nextDescription,
            type: nextType,
            amount: nextAmount,
            date: nextDate,
            schedule
          });
        }

        if (
          currentSeriesType === TransactionSeriesType.INSTALLMENT &&
          wantsRecurring &&
          currentTransaction.occurrenceNumber !== null
        ) {
          return await this.convertInstallmentToRecurring(
            currentTransaction,
            {
              accountId: data.accountId,
              categoryId: data.categoryId,
              cardId: data.cardId,
              description: data.description,
              type: data.type,
              amount: data.amount,
              date: data.date
            },
            nextDate
          );
        }

        if (
          currentSeriesType === TransactionSeriesType.RECURRING &&
          wantsInstallment &&
          currentTransaction.occurrenceNumber !== null
        ) {
          return await this.convertRecurringToInstallment(
            currentTransaction,
            {
              accountId: data.accountId,
              categoryId: data.categoryId,
              cardId: data.cardId,
              description: data.description,
              type: data.type,
              amount: data.amount,
              date: data.date
            },
            nextDate,
            schedule.installments
          );
        }
      }
    }

    if (schedule?.mode === 'NONE' && currentTransaction.seriesId) {
      throw new InvalidArgumentError({
        code: 'transactions.schedule_detach_not_allowed',
        i18nKey: 'errors.transactions.schedule_detach_not_allowed'
      });
    }

    const scope = data.scope ?? 'SINGLE';

    if (
      scope === 'THIS_AND_FUTURE' &&
      currentTransaction.seriesId &&
      currentTransaction.occurrenceNumber !== null
    ) {
      const seriesRows = await this.repository.findBySeriesFromOccurrence(
        currentTransaction.seriesId,
        currentTransaction.occurrenceNumber
      );

      for (const row of seriesRows) {
        if (row.isPaid && row.accountId && !row.isProjected) {
          await this.applyBalanceImpact(row.accountId, userId, row.type, -row.amount);
        }
      }

      const seriesPayload: UpdateTransactionData = { ...payload };
      if (nextType === TransactionType.INCOME) {
        delete seriesPayload.competenceDate;
      }

      const updatedRows = await this.repository.updateManyFromOccurrence(
        currentTransaction.seriesId,
        currentTransaction.occurrenceNumber,
        seriesPayload
      );

      for (const row of updatedRows) {
        if (row.isPaid && row.accountId && !row.isProjected) {
          await this.applyBalanceImpact(row.accountId, userId, row.type, row.amount);
        }
      }

      return (
        updatedRows.find((row) => row.id === transactionId) ??
        (await this.findById(transactionId, userId))
      );
    }

    const updatedTransaction = await this.repository.update(transactionId, payload);

    if (currentTransaction.isPaid && currentTransaction.accountId && !currentTransaction.isProjected) {
      await this.applyBalanceImpact(
        currentTransaction.accountId,
        userId,
        currentTransaction.type,
        -currentTransaction.amount
      );
    }

    if (updatedTransaction.isPaid && updatedTransaction.accountId && !updatedTransaction.isProjected) {
      await this.applyBalanceImpact(
        updatedTransaction.accountId,
        userId,
        updatedTransaction.type,
        updatedTransaction.amount
      );
    }

    return updatedTransaction;
  }

  private async promoteStandaloneToSeries(
    current: Transaction,
    merged: {
      accountId: string | null;
      categoryId: string | null;
      cardId: string | null;
      description: string | null;
      type: TransactionType;
      amount: number;
      date: string;
      schedule: { mode: 'INSTALLMENT'; installments: number } | { mode: 'RECURRING' };
    }
  ): Promise<Transaction> {
    const anchorDay = parseYmd(merged.date).day;
    let occurrences;
    let seriesType: TransactionSeriesType;
    let totalOccurrences: number | null;

    if (merged.schedule.mode === 'INSTALLMENT') {
      const drafts = this.buildInstallmentDrafts(merged.date, merged.schedule.installments);

      occurrences = drafts.map((draft, index) => ({
        occurrenceNumber: draft.occurrenceNumber,
        date: draft.date,
        isPaid: index === 0 ? current.isPaid : false,
        isProjected: false
      }));
      seriesType = TransactionSeriesType.INSTALLMENT;
      totalOccurrences = drafts.length;
    } else {
      occurrences = this.seriesMaintenance.buildInitialRecurringOccurrences(
        merged.date,
        anchorDay,
        current.isPaid
      );
      seriesType = TransactionSeriesType.RECURRING;
      totalOccurrences = null;
    }

    if (current.isPaid && current.accountId && !current.isProjected) {
      await this.applyBalanceImpact(current.accountId, current.userId, current.type, -current.amount);
    }

    const created = await this.repository.promoteToSeries(current.id, {
      userId: current.userId,
      type: seriesType,
      accountId: merged.accountId,
      categoryId: merged.categoryId,
      cardId: merged.cardId,
      description: merged.description,
      transactionType: merged.type,
      amount: merged.amount,
      anchorDate: merged.date,
      anchorDay,
      totalOccurrences,
      occurrences
    });

    const first = await this.findById(created.firstTransactionId, current.userId);

    if (first.isPaid && first.accountId && !first.isProjected) {
      await this.applyBalanceImpact(first.accountId, first.userId, first.type, first.amount);
    }

    return first;
  }

  private async convertInstallmentToRecurring(
    current: Transaction,
    fieldUpdates: UpdateTransactionData,
    nextDate: string
  ): Promise<Transaction> {
    if (!current.seriesId || current.occurrenceNumber === null) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_series_conversion',
        i18nKey: 'errors.transactions.invalid_series_conversion'
      });
    }

    const affected = await this.repository.findBySeriesFromOccurrence(
      current.seriesId,
      current.occurrenceNumber
    );

    for (const row of affected) {
      if (row.isPaid && row.accountId && !row.isProjected) {
        await this.applyBalanceImpact(row.accountId, current.userId, row.type, -row.amount);
      }
    }

    const todayYmd = utcTodayYmd();
    const updated = await this.repository.convertSeriesToRecurring({
      seriesId: current.seriesId,
      fromOccurrenceNumber: current.occurrenceNumber,
      fieldUpdates: {
        ...fieldUpdates,
        date: fieldUpdates.date ?? nextDate
      },
      todayYmd
    });

    await this.seriesMaintenance.extendActiveRecurringSeries(todayYmd);

    const refreshedAffected = await this.repository.findBySeriesFromOccurrence(
      current.seriesId,
      current.occurrenceNumber
    );

    for (const row of refreshedAffected) {
      if (row.isPaid && row.accountId && !row.isProjected) {
        await this.applyBalanceImpact(row.accountId, current.userId, row.type, row.amount);
      }
    }

    return (await this.findById(updated.id, current.userId)) ?? updated;
  }

  private async convertRecurringToInstallment(
    current: Transaction,
    fieldUpdates: UpdateTransactionData,
    nextDate: string,
    installments: number
  ): Promise<Transaction> {
    if (!current.seriesId || current.occurrenceNumber === null) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_series_conversion',
        i18nKey: 'errors.transactions.invalid_series_conversion'
      });
    }

    const drafts = this.buildInstallmentDrafts(nextDate, installments);

    const affected = await this.repository.findBySeriesFromOccurrence(
      current.seriesId,
      current.occurrenceNumber
    );

    for (const row of affected) {
      if (row.isPaid && row.accountId && !row.isProjected) {
        await this.applyBalanceImpact(row.accountId, current.userId, row.type, -row.amount);
      }
    }

    const updated = await this.repository.convertSeriesToInstallment({
      seriesId: current.seriesId,
      fromOccurrenceNumber: current.occurrenceNumber,
      startDate: nextDate,
      occurrenceCount: drafts.length,
      fieldUpdates: {
        ...fieldUpdates,
        date: fieldUpdates.date ?? nextDate
      }
    });

    const refreshedAffected = await this.repository.findBySeriesFromOccurrence(
      current.seriesId,
      current.occurrenceNumber
    );

    for (const row of refreshedAffected) {
      if (row.isPaid && row.accountId && !row.isProjected) {
        await this.applyBalanceImpact(row.accountId, current.userId, row.type, row.amount);
      }
    }

    return (await this.findById(updated.id, current.userId)) ?? updated;
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

    if (currentTransaction.transferGroupId) {
      throw new InvalidArgumentError({
        code: 'transactions.transfer_paid_status_not_allowed',
        i18nKey: 'errors.transactions.transfer_paid_status_not_allowed'
      });
    }

    if (currentTransaction.isPaid === isPaid) {
      return currentTransaction;
    }

    const updatedTransaction = await this.repository.updateIsPaid(transactionId, isPaid);

    if (updatedTransaction.accountId && !updatedTransaction.isProjected) {
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

  async remove(
    transactionId: string,
    userId: string,
    scope: 'SINGLE' | 'THIS_AND_FUTURE' = 'SINGLE'
  ): Promise<void> {
    this.validateTransactionId(transactionId);
    this.validateUserId(userId);

    const transaction = await this.findById(transactionId, userId);

    if (transaction.transferGroupId) {
      const deleted = await this.repository.deleteTransferPair(
        transaction.transferGroupId,
        userId
      );

      if (!deleted) {
        throw new InvalidArgumentError({
          code: 'transactions.transfer_failed',
          i18nKey: 'errors.transactions.transfer_failed'
        });
      }

      return;
    }

    if (
      scope === 'THIS_AND_FUTURE' &&
      transaction.seriesId &&
      transaction.occurrenceNumber !== null
    ) {
      const { deleted } = await this.repository.deleteFromOccurrence(
        transaction.seriesId,
        transaction.occurrenceNumber
      );

      for (const row of deleted) {
        if (row.isPaid && row.accountId && !row.isProjected) {
          await this.applyBalanceImpact(row.accountId, userId, row.type, -row.amount);
        }
      }

      return;
    }

    if (transaction.isPaid && transaction.accountId && !transaction.isProjected) {
      await this.applyBalanceImpact(
        transaction.accountId,
        userId,
        transaction.type,
        -transaction.amount
      );
    }

    await this.repository.delete(transactionId);
  }

  private buildInstallmentDrafts(startYmd: string, installments: number): OccurrenceDraft[] {
    if (installments < 2) {
      throw new InvalidArgumentError({
        code: 'transactions.installment_requires_two_months',
        i18nKey: 'errors.transactions.installment_requires_two_months'
      });
    }

    return generateInstallmentOccurrencesByCount(startYmd, installments);
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

  private validateTransferData(data: CreateTransferInputData): void {
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

    if (
      data.competenceDate !== undefined &&
      data.competenceDate !== null &&
      Number.isNaN(new Date(data.competenceDate).getTime())
    ) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_competence_date',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'competence_date' }
      });
    }

    if (typeof data.isPaid !== 'boolean') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_is_paid',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'is_paid' }
      });
    }

    const schedule = data.schedule ?? { mode: 'NONE' as const };
    if (schedule.mode === 'INSTALLMENT') {
      this.validateInstallmentCount(schedule.installments);
    }
  }

  private validateInstallmentCount(installments: number): void {
    if (!Number.isInteger(installments) || installments < 2 || installments > 360) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_installment_count',
        i18nKey: 'errors.transactions.invalid_installment_count'
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
      data.date === undefined &&
      data.competenceDate === undefined &&
      data.schedule === undefined
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

    if (
      data.competenceDate !== undefined &&
      data.competenceDate !== null &&
      Number.isNaN(new Date(data.competenceDate).getTime())
    ) {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_competence_date',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'competence_date' }
      });
    }

    if (data.schedule?.mode === 'INSTALLMENT') {
      this.validateInstallmentCount(data.schedule.installments);
    }
  }

  private validateTransferGroupId(transferGroupId: string): void {
    if (!transferGroupId || typeof transferGroupId !== 'string') {
      throw new InvalidArgumentError({
        code: 'transactions.invalid_transfer_group_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'transfer_group_id' }
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

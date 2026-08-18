import { Injectable } from '@nestjs/common';
import type { ListTransactionsQueryInput } from '@mybills/dtos';
import {
  Prisma,
  Transaction as PrismaTransaction,
  TransactionSeries as PrismaTransactionSeries,
  TransactionSeriesType,
  TransactionType
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import {
  CreateSeriesWithOccurrencesData,
  CreateSeriesWithOccurrencesResult,
  SeriesOccurrenceInput
} from '../../contracts/create-series-data.contract';
import {
  ConvertSeriesToInstallmentData,
  ConvertSeriesToRecurringData
} from '../../contracts/convert-series-data.contract';
import {
  CreateTransferData,
  CreateTransferResult
} from '../../contracts/create-transfer-data.contract';
import { TransferPair } from '../../contracts/transfer-pair.contract';
import { TransactionSeriesRecord } from '../../contracts/transaction-series-record.contract';
import { UpdateTransferData } from '../../contracts/update-transfer-data.contract';
import { CreateTransactionData } from '../../contracts/create-transaction-data.contract';
import { UpdateTransactionData } from '../../contracts/update-transaction-data.contract';
import { Transaction } from '../../entities/transaction.entity';
import {
  addMonthsPreserveDay,
  compareYmd,
  generateInstallmentOccurrencesByCount,
  parseYmd
} from '../../lib/monthly-schedule';
import {
  formatYearMonth,
  getInvoicePaymentMonth,
  resolveClosingDay
} from '../../../credit-cards/lib/billing-cycle';
import {
  assignCardExpenseToInvoice,
  detachTransactionFromInvoice,
  ensureInvoicesForDates,
  type InvoiceCardRef,
  ymdFromUtcDate
} from '../../../credit-cards/lib/invoice-assignment';
import { TransactionRepository } from '../transaction.repository';

type PrismaTransactionWithSeries = PrismaTransaction & {
  series?: Pick<PrismaTransactionSeries, 'type' | 'totalOccurrences'> | null;
  card?: { closingDay: number; closingOnLastDay: boolean; dueDay: number } | null;
};

const transactionDetailInclude = {
  series: {
    select: {
      type: true,
      totalOccurrences: true
    }
  },
  card: {
    select: {
      closingDay: true,
      closingOnLastDay: true,
      dueDay: true
    }
  }
} as const;

@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapSeries(series: PrismaTransactionSeries): TransactionSeriesRecord {
    return {
      id: series.id,
      userId: series.userId,
      type: series.type,
      accountId: series.accountId,
      categoryId: series.categoryId,
      cardId: series.cardId,
      description: series.description,
      transactionType: series.transactionType,
      amount: series.amount,
      anchorDate: series.anchorDate.toISOString().slice(0, 10),
      anchorDay: series.anchorDay,
      totalOccurrences: series.totalOccurrences,
      nextOccurrenceNumber: series.nextOccurrenceNumber,
      isActive: series.isActive
    };
  }

  private mapToEntity(transaction: PrismaTransactionWithSeries): Transaction {
    const dateYmd = transaction.date.toISOString().slice(0, 10);
    const invoicePaymentMonth =
      transaction.cardId && transaction.card
        ? formatYearMonth(
            getInvoicePaymentMonth(
              resolveClosingDay(transaction.card),
              transaction.card.dueDay,
              dateYmd
            )
          )
        : null;

    return {
      id: transaction.id,
      userId: transaction.userId,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      cardId: transaction.cardId,
      invoiceId: transaction.invoiceId,
      transferGroupId: transaction.transferGroupId,
      seriesId: transaction.seriesId,
      occurrenceNumber: transaction.occurrenceNumber,
      seriesType: transaction.series?.type ?? null,
      seriesTotalOccurrences: transaction.series?.totalOccurrences ?? null,
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date.toISOString(),
      competenceDate: transaction.competenceDate?.toISOString() ?? null,
      isPaid: transaction.isPaid,
      isProjected: transaction.isProjected,
      invoicePaymentMonth,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
  }

  private async loadInvoiceCard(
    tx: Prisma.TransactionClient | PrismaService,
    cardId: string | null | undefined
  ): Promise<InvoiceCardRef | null> {
    if (!cardId) {
      return null;
    }
    const card = await tx.creditCard.findUnique({
      where: { id: cardId },
      select: {
        id: true,
        userId: true,
        closingDay: true,
        closingOnLastDay: true,
        dueDay: true
      }
    });
    return card;
  }

  private async attachInvoiceOnCreate(
    tx: Prisma.TransactionClient,
    params: {
      cardId: string | null | undefined;
      type: TransactionType;
      dateYmd: string;
      amount: number;
    }
  ): Promise<string | null> {
    const card = await this.loadInvoiceCard(tx, params.cardId);
    return assignCardExpenseToInvoice(tx, {
      card,
      type: params.type,
      dateYmd: params.dateYmd,
      amount: params.amount
    });
  }

  private async reassignInvoiceForExisting(
    tx: Prisma.TransactionClient,
    row: {
      invoiceId: string | null;
      amount: number;
      cardId: string | null;
      type: TransactionType;
      date: Date;
    },
    next: {
      cardId: string | null;
      type: TransactionType;
      amount: number;
      dateYmd: string;
    }
  ): Promise<string | null> {
    const card = await this.loadInvoiceCard(tx, next.cardId);
    return assignCardExpenseToInvoice(tx, {
      card,
      type: next.type,
      dateYmd: next.dateYmd,
      amount: next.amount,
      previousInvoiceId: row.invoiceId,
      previousAmount: row.amount
    });
  }

  private utcDayStart(ymd: string): Date {
    const parts = ymd.split('-');
    const year = Number(parts[0] ?? 0);
    const month = Number(parts[1] ?? 1);
    const day = Number(parts[2] ?? 1);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private buildWhereClause(
    userId: string,
    filters?: ListTransactionsQueryInput
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = { userId };

    if (!filters) {
      return where;
    }

    if (filters.month !== undefined && filters.year !== undefined) {
      const gte = new Date(Date.UTC(filters.year, filters.month - 1, 1));
      const lt = new Date(Date.UTC(filters.year, filters.month, 1));
      where.date = { gte, lt };
    } else if (filters.from !== undefined && filters.to !== undefined) {
      const gte = this.utcDayStart(filters.from);
      const toStart = this.utcDayStart(filters.to);
      const lt = new Date(
        Date.UTC(toStart.getUTCFullYear(), toStart.getUTCMonth(), toStart.getUTCDate() + 1)
      );
      where.date = { gte, lt };
    }

    if (filters.type !== undefined) {
      where.type = filters.type;
    } else if (filters.includeTransfer === false) {
      where.transferGroupId = null;
      where.type = { in: [TransactionType.INCOME, TransactionType.EXPENSE] };
    }

    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
    }

    if (filters.accountId !== undefined) {
      where.accountId = filters.accountId;
    }

    if (filters.cardId !== undefined) {
      where.cardId = filters.cardId;
    }

    if (filters.invoiceId !== undefined) {
      where.invoiceId = filters.invoiceId;
    }

    if (filters.isPaid !== undefined) {
      where.isPaid = filters.isPaid;
    }

    if (filters.isProjected !== undefined) {
      where.isProjected = filters.isProjected;
    }

    if (filters.search !== undefined) {
      where.description = { contains: filters.search, mode: 'insensitive' };
    }

    return where;
  }

  async findAllByUserId(
    userId: string,
    filters?: ListTransactionsQueryInput
  ): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: this.buildWhereClause(userId, filters),
      include: transactionDetailInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      ...(filters?.limit !== undefined ? { take: filters.limit } : {})
    });

    return transactions.map((transaction) => this.mapToEntity(transaction));
  }

  async findByIdAndUserId(transactionId: string, userId: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      },
      include: transactionDetailInclude
    });

    if (!transaction) {
      return null;
    }

    return this.mapToEntity(transaction);
  }

  async findByTransferGroupIdAndUserId(
    transferGroupId: string,
    userId: string
  ): Promise<TransferPair | null> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        transferGroupId,
        userId
      },
      include: transactionDetailInclude
    });

    if (transactions.length !== 2) {
      return null;
    }

    const source = transactions.find((tx) => tx.type === TransactionType.EXPENSE);
    const destination = transactions.find((tx) => tx.type === TransactionType.INCOME);

    if (!source || !destination) {
      return null;
    }

    return {
      sourceTransaction: this.mapToEntity(source),
      destinationTransaction: this.mapToEntity(destination)
    };
  }

  async create(data: CreateTransactionData): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const dateYmd = data.date.slice(0, 10);
      const invoiceId = await this.attachInvoiceOnCreate(tx, {
        cardId: data.cardId,
        type: data.type,
        dateYmd,
        amount: data.amount
      });

      const transaction = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          cardId: data.cardId,
          invoiceId,
          description: data.description,
          type: data.type,
          amount: data.amount,
          date: this.utcDayStart(dateYmd),
          competenceDate: data.competenceDate
            ? this.utcDayStart(data.competenceDate.slice(0, 10))
            : null,
          isPaid: data.isPaid,
          isProjected: false
        },
        include: transactionDetailInclude
      });

      return this.mapToEntity(transaction);
    });
  }

  async createSeriesWithOccurrences(
    data: CreateSeriesWithOccurrencesData
  ): Promise<CreateSeriesWithOccurrencesResult> {
    return await this.prisma.$transaction(async (tx) => {
      const series = await tx.transactionSeries.create({
        data: {
          userId: data.userId,
          type: data.type,
          accountId: data.accountId ?? null,
          categoryId: data.categoryId ?? null,
          cardId: data.cardId ?? null,
          description: data.description ?? null,
          transactionType: data.transactionType,
          amount: data.amount,
          anchorDate: this.utcDayStart(data.anchorDate),
          anchorDay: data.anchorDay,
          totalOccurrences: data.totalOccurrences,
          nextOccurrenceNumber: data.occurrences.length + 1,
          isActive: data.type === TransactionSeriesType.RECURRING
        }
      });

      const card = await this.loadInvoiceCard(tx, data.cardId);
      const dateToInvoiceId =
        card && data.transactionType === TransactionType.EXPENSE
          ? await ensureInvoicesForDates(
              tx,
              card,
              data.occurrences.map((occurrence) => occurrence.date)
            )
          : new Map<string, string>();

      const amountByInvoice = new Map<string, number>();

      const created = await Promise.all(
        data.occurrences.map(async (occurrence) => {
          const dateYmd = occurrence.date.slice(0, 10);
          const invoiceId = dateToInvoiceId.get(dateYmd) ?? null;
          if (invoiceId) {
            amountByInvoice.set(invoiceId, (amountByInvoice.get(invoiceId) ?? 0) + data.amount);
          }

          return tx.transaction.create({
            data: {
              userId: data.userId,
              accountId: data.accountId ?? null,
              categoryId: data.categoryId ?? null,
              cardId: data.cardId ?? null,
              invoiceId,
              description: data.description ?? null,
              type: data.transactionType,
              amount: data.amount,
              date: this.utcDayStart(occurrence.date),
              isPaid: occurrence.isPaid,
              isProjected: occurrence.isProjected,
              seriesId: series.id,
              occurrenceNumber: occurrence.occurrenceNumber
            }
          });
        })
      );

      for (const [invoiceId, amount] of amountByInvoice) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { amount: { increment: amount } }
        });
      }

      const first = created.find((item) => item.occurrenceNumber === 1) ?? created[0];

      if (!first) {
        throw new Error('Failed to create series occurrences');
      }

      return {
        seriesId: series.id,
        firstTransactionId: first.id
      };
    });
  }

  async promoteToSeries(
    existingTransactionId: string,
    data: CreateSeriesWithOccurrencesData
  ): Promise<CreateSeriesWithOccurrencesResult> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { id: existingTransactionId }
      });

      if (!existing || existing.seriesId) {
        throw new Error('Cannot promote transaction to series');
      }

      const firstOccurrence =
        data.occurrences.find((item) => item.occurrenceNumber === 1) ?? data.occurrences[0];

      if (!firstOccurrence) {
        throw new Error('Series requires at least one occurrence');
      }

      const remaining = data.occurrences.filter(
        (item) => item.occurrenceNumber !== firstOccurrence.occurrenceNumber
      );

      const series = await tx.transactionSeries.create({
        data: {
          userId: data.userId,
          type: data.type,
          accountId: data.accountId ?? null,
          categoryId: data.categoryId ?? null,
          cardId: data.cardId ?? null,
          description: data.description ?? null,
          transactionType: data.transactionType,
          amount: data.amount,
          anchorDate: this.utcDayStart(data.anchorDate),
          anchorDay: data.anchorDay,
          totalOccurrences: data.totalOccurrences,
          nextOccurrenceNumber: data.occurrences.length + 1,
          isActive: data.type === TransactionSeriesType.RECURRING
        }
      });

      const card = await this.loadInvoiceCard(tx, data.cardId);
      const allDates = data.occurrences.map((occurrence) => occurrence.date);
      const dateToInvoiceId =
        card && data.transactionType === TransactionType.EXPENSE
          ? await ensureInvoicesForDates(tx, card, allDates)
          : new Map<string, string>();

      const firstDateYmd = firstOccurrence.date.slice(0, 10);
      const firstInvoiceId = dateToInvoiceId.get(firstDateYmd) ?? null;

      await detachTransactionFromInvoice(tx, existing.invoiceId, existing.amount);
      if (firstInvoiceId) {
        await tx.invoice.update({
          where: { id: firstInvoiceId },
          data: { amount: { increment: data.amount } }
        });
      }

      await tx.transaction.update({
        where: { id: existingTransactionId },
        data: {
          accountId: data.accountId ?? null,
          categoryId: data.categoryId ?? null,
          cardId: data.cardId ?? null,
          invoiceId: firstInvoiceId,
          description: data.description ?? null,
          type: data.transactionType,
          amount: data.amount,
          date: this.utcDayStart(firstOccurrence.date),
          isProjected: false,
          seriesId: series.id,
          occurrenceNumber: 1
        }
      });

      const amountByInvoice = new Map<string, number>();

      await Promise.all(
        remaining.map(async (occurrence) => {
          const dateYmd = occurrence.date.slice(0, 10);
          const invoiceId = dateToInvoiceId.get(dateYmd) ?? null;
          if (invoiceId) {
            amountByInvoice.set(invoiceId, (amountByInvoice.get(invoiceId) ?? 0) + data.amount);
          }

          return tx.transaction.create({
            data: {
              userId: data.userId,
              accountId: data.accountId ?? null,
              categoryId: data.categoryId ?? null,
              cardId: data.cardId ?? null,
              invoiceId,
              description: data.description ?? null,
              type: data.transactionType,
              amount: data.amount,
              date: this.utcDayStart(occurrence.date),
              isPaid: occurrence.isPaid,
              isProjected: occurrence.isProjected,
              seriesId: series.id,
              occurrenceNumber: occurrence.occurrenceNumber
            }
          });
        })
      );

      for (const [invoiceId, amount] of amountByInvoice) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { amount: { increment: amount } }
        });
      }

      return {
        seriesId: series.id,
        firstTransactionId: existingTransactionId
      };
    });
  }

  async convertSeriesToRecurring(data: ConvertSeriesToRecurringData): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const series = await tx.transactionSeries.findUnique({
        where: { id: data.seriesId }
      });

      if (!series) {
        throw new Error('Series not found');
      }

      const fieldUpdates = data.fieldUpdates;
      const targets = await tx.transaction.findMany({
        where: {
          seriesId: data.seriesId,
          occurrenceNumber: { gte: data.fromOccurrenceNumber }
        },
        orderBy: { occurrenceNumber: 'asc' }
      });

      let editedId: string | null = null;

      for (const target of targets) {
        const offset =
          target.occurrenceNumber !== null
            ? target.occurrenceNumber - data.fromOccurrenceNumber
            : 0;

        let nextDate = target.date;
        if (fieldUpdates.date !== undefined) {
          if (offset === 0) {
            nextDate = this.utcDayStart(fieldUpdates.date);
          } else {
            const anchorDay = parseYmd(fieldUpdates.date).day;
            nextDate = this.utcDayStart(
              addMonthsPreserveDay(fieldUpdates.date, offset, anchorDay)
            );
          }
        }

        const dateYmd = nextDate.toISOString().slice(0, 10);
        const isProjected = compareYmd(dateYmd, data.todayYmd) > 0;
        const nextCardId =
          fieldUpdates.cardId !== undefined ? fieldUpdates.cardId : target.cardId;
        const nextType = fieldUpdates.type !== undefined ? fieldUpdates.type : target.type;
        const nextAmount =
          fieldUpdates.amount !== undefined ? fieldUpdates.amount : target.amount;

        const invoiceId = await this.reassignInvoiceForExisting(
          tx,
          target,
          {
            cardId: nextCardId,
            type: nextType,
            amount: nextAmount,
            dateYmd
          }
        );

        const row = await tx.transaction.update({
          where: { id: target.id },
          data: {
            ...(fieldUpdates.accountId !== undefined ? { accountId: fieldUpdates.accountId } : {}),
            ...(fieldUpdates.categoryId !== undefined
              ? { categoryId: fieldUpdates.categoryId }
              : {}),
            ...(fieldUpdates.cardId !== undefined ? { cardId: fieldUpdates.cardId } : {}),
            ...(fieldUpdates.description !== undefined
              ? { description: fieldUpdates.description }
              : {}),
            ...(fieldUpdates.type !== undefined ? { type: fieldUpdates.type } : {}),
            ...(fieldUpdates.amount !== undefined ? { amount: fieldUpdates.amount } : {}),
            date: nextDate,
            isProjected,
            invoiceId
          }
        });

        if (target.occurrenceNumber === data.fromOccurrenceNumber) {
          editedId = row.id;
        }
      }

      const pastRows = await tx.transaction.findMany({
        where: {
          seriesId: data.seriesId,
          occurrenceNumber: { lt: data.fromOccurrenceNumber }
        }
      });

      for (const past of pastRows) {
        const dateYmd = past.date.toISOString().slice(0, 10);
        await tx.transaction.update({
          where: { id: past.id },
          data: {
            isProjected: compareYmd(dateYmd, data.todayYmd) > 0
          }
        });
      }

      const anchorDate =
        fieldUpdates.date !== undefined && data.fromOccurrenceNumber === 1
          ? fieldUpdates.date
          : series.anchorDate.toISOString().slice(0, 10);
      const anchorDay =
        fieldUpdates.date !== undefined && data.fromOccurrenceNumber === 1
          ? parseYmd(fieldUpdates.date).day
          : series.anchorDay;

      await tx.transactionSeries.update({
        where: { id: data.seriesId },
        data: {
          type: TransactionSeriesType.RECURRING,
          totalOccurrences: null,
          isActive: true,
          ...(fieldUpdates.accountId !== undefined ? { accountId: fieldUpdates.accountId } : {}),
          ...(fieldUpdates.categoryId !== undefined
            ? { categoryId: fieldUpdates.categoryId }
            : {}),
          ...(fieldUpdates.cardId !== undefined ? { cardId: fieldUpdates.cardId } : {}),
          ...(fieldUpdates.description !== undefined
            ? { description: fieldUpdates.description }
            : {}),
          ...(fieldUpdates.type !== undefined ? { transactionType: fieldUpdates.type } : {}),
          ...(fieldUpdates.amount !== undefined ? { amount: fieldUpdates.amount } : {}),
          ...(fieldUpdates.date !== undefined && data.fromOccurrenceNumber === 1
            ? {
                anchorDate: this.utcDayStart(anchorDate),
                anchorDay
              }
            : {})
        }
      });

      const edited =
        editedId !== null
          ? await tx.transaction.findUniqueOrThrow({
              where: { id: editedId },
              include: transactionDetailInclude
            })
          : await tx.transaction.findFirstOrThrow({
              where: {
                seriesId: data.seriesId,
                occurrenceNumber: data.fromOccurrenceNumber
              },
              include: transactionDetailInclude
            });

      return this.mapToEntity(edited);
    });
  }

  async convertSeriesToInstallment(data: ConvertSeriesToInstallmentData): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const series = await tx.transactionSeries.findUnique({
        where: { id: data.seriesId }
      });

      if (!series) {
        throw new Error('Series not found');
      }

      const drafts = generateInstallmentOccurrencesByCount(data.startDate, data.occurrenceCount);
      const fieldUpdates = data.fieldUpdates;

      const toDelete = await tx.transaction.findMany({
        where: {
          seriesId: data.seriesId,
          occurrenceNumber: { gte: data.fromOccurrenceNumber }
        }
      });

      const keepFirst =
        toDelete.find((row) => row.occurrenceNumber === data.fromOccurrenceNumber) ?? null;

      if (!keepFirst) {
        throw new Error('Starting occurrence not found');
      }

      for (const row of toDelete) {
        if (row.occurrenceNumber === data.fromOccurrenceNumber) {
          continue;
        }
        await detachTransactionFromInvoice(tx, row.invoiceId, row.amount);
      }

      await tx.transaction.deleteMany({
        where: {
          seriesId: data.seriesId,
          occurrenceNumber: { gt: data.fromOccurrenceNumber }
        }
      });

      const firstDraft = drafts[0];
      if (!firstDraft) {
        throw new Error('Installment requires occurrences');
      }

      const accountId =
        fieldUpdates.accountId !== undefined ? fieldUpdates.accountId : series.accountId;
      const categoryId =
        fieldUpdates.categoryId !== undefined ? fieldUpdates.categoryId : series.categoryId;
      const cardId = fieldUpdates.cardId !== undefined ? fieldUpdates.cardId : series.cardId;
      const description =
        fieldUpdates.description !== undefined ? fieldUpdates.description : series.description;
      const transactionType =
        fieldUpdates.type !== undefined ? fieldUpdates.type : series.transactionType;
      const amount = fieldUpdates.amount !== undefined ? fieldUpdates.amount : series.amount;

      const keepInvoiceId = await this.reassignInvoiceForExisting(
        tx,
        keepFirst,
        {
          cardId,
          type: transactionType,
          amount,
          dateYmd: firstDraft.date.slice(0, 10)
        }
      );

      await tx.transaction.update({
        where: { id: keepFirst.id },
        data: {
          ...(fieldUpdates.accountId !== undefined ? { accountId: fieldUpdates.accountId } : {}),
          ...(fieldUpdates.categoryId !== undefined
            ? { categoryId: fieldUpdates.categoryId }
            : {}),
          ...(fieldUpdates.cardId !== undefined ? { cardId: fieldUpdates.cardId } : {}),
          ...(fieldUpdates.description !== undefined
            ? { description: fieldUpdates.description }
            : {}),
          ...(fieldUpdates.type !== undefined ? { type: fieldUpdates.type } : {}),
          ...(fieldUpdates.amount !== undefined ? { amount: fieldUpdates.amount } : {}),
          date: this.utcDayStart(firstDraft.date),
          isProjected: false,
          occurrenceNumber: data.fromOccurrenceNumber,
          invoiceId: keepInvoiceId
        }
      });

      const card = await this.loadInvoiceCard(tx, cardId);
      const laterDates = drafts.slice(1).map((draft) => draft.date);
      const dateToInvoiceId =
        card && transactionType === TransactionType.EXPENSE
          ? await ensureInvoicesForDates(tx, card, laterDates)
          : new Map<string, string>();
      const amountByInvoice = new Map<string, number>();

      for (let index = 1; index < drafts.length; index += 1) {
        const draft = drafts[index];
        if (!draft) {
          continue;
        }

        const dateYmd = draft.date.slice(0, 10);
        const invoiceId = dateToInvoiceId.get(dateYmd) ?? null;
        if (invoiceId) {
          amountByInvoice.set(invoiceId, (amountByInvoice.get(invoiceId) ?? 0) + amount);
        }

        await tx.transaction.create({
          data: {
            userId: series.userId,
            accountId,
            categoryId,
            cardId,
            invoiceId,
            description,
            type: transactionType,
            amount,
            date: this.utcDayStart(draft.date),
            isPaid: false,
            isProjected: false,
            seriesId: series.id,
            occurrenceNumber: data.fromOccurrenceNumber + index
          }
        });
      }

      for (const [invoiceId, delta] of amountByInvoice) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { amount: { increment: delta } }
        });
      }

      await tx.transaction.updateMany({
        where: { seriesId: data.seriesId },
        data: { isProjected: false }
      });

      const totalOccurrences = data.fromOccurrenceNumber + drafts.length - 1;

      await tx.transactionSeries.update({
        where: { id: data.seriesId },
        data: {
          type: TransactionSeriesType.INSTALLMENT,
          totalOccurrences,
          isActive: false,
          nextOccurrenceNumber: totalOccurrences + 1,
          accountId,
          categoryId,
          cardId,
          description,
          transactionType,
          amount,
          ...(data.fromOccurrenceNumber === 1
            ? {
                anchorDate: this.utcDayStart(data.startDate),
                anchorDay: parseYmd(data.startDate).day
              }
            : {})
        }
      });

      const edited = await tx.transaction.findUniqueOrThrow({
        where: { id: keepFirst.id },
        include: transactionDetailInclude
      });

      return this.mapToEntity(edited);
    });
  }

  async createTransferPair(data: CreateTransferData): Promise<CreateTransferResult | null> {
    return await this.prisma
      .$transaction(async (tx) => {
        await tx.account.update({
          where: {
            id: data.sourceAccountId,
            userId: data.userId,
            balance: {
              gte: data.amount
            }
          },
          data: {
            balance: {
              decrement: data.amount
            }
          }
        });

        await tx.account.update({
          where: {
            id: data.destinationAccountId,
            userId: data.userId
          },
          data: {
            balance: {
              increment: data.amount
            }
          }
        });

        const sourceTransaction = await tx.transaction.create({
          data: {
            userId: data.userId,
            accountId: data.sourceAccountId,
            categoryId: data.categoryId,
            transferGroupId: data.transferGroupId,
            description: data.description,
            type: TransactionType.EXPENSE,
            amount: data.amount,
            date: new Date(data.date),
            isPaid: true,
            isProjected: false
          }
        });

        const destinationTransaction = await tx.transaction.create({
          data: {
            userId: data.userId,
            accountId: data.destinationAccountId,
            categoryId: data.categoryId,
            transferGroupId: data.transferGroupId,
            description: data.description,
            type: TransactionType.INCOME,
            amount: data.amount,
            date: new Date(data.date),
            isPaid: true,
            isProjected: false
          }
        });

        return {
          transferGroupId: data.transferGroupId,
          sourceTransaction: this.mapToEntity(sourceTransaction),
          destinationTransaction: this.mapToEntity(destinationTransaction)
        };
      })
      .catch(() => null);
  }

  async updateTransferPair(
    transferGroupId: string,
    data: UpdateTransferData
  ): Promise<CreateTransferResult | null> {
    return await this.prisma
      .$transaction(async (tx) => {
        const existing = await tx.transaction.findMany({
          where: {
            transferGroupId,
            userId: data.userId
          }
        });

        if (existing.length !== 2) {
          return null;
        }

        const oldSource = existing.find((item) => item.type === TransactionType.EXPENSE);
        const oldDestination = existing.find((item) => item.type === TransactionType.INCOME);

        if (!oldSource || !oldDestination || !oldSource.accountId || !oldDestination.accountId) {
          return null;
        }

        await tx.account.update({
          where: { id: oldSource.accountId, userId: data.userId },
          data: { balance: { increment: oldSource.amount } }
        });

        await tx.account.update({
          where: { id: oldDestination.accountId, userId: data.userId },
          data: { balance: { decrement: oldDestination.amount } }
        });

        await tx.account.update({
          where: {
            id: data.sourceAccountId,
            userId: data.userId,
            balance: { gte: data.amount }
          },
          data: { balance: { decrement: data.amount } }
        });

        await tx.account.update({
          where: { id: data.destinationAccountId, userId: data.userId },
          data: { balance: { increment: data.amount } }
        });

        const sourceTransaction = await tx.transaction.update({
          where: { id: oldSource.id },
          data: {
            accountId: data.sourceAccountId,
            description: data.description,
            amount: data.amount,
            date: new Date(data.date)
          }
        });

        const destinationTransaction = await tx.transaction.update({
          where: { id: oldDestination.id },
          data: {
            accountId: data.destinationAccountId,
            description: data.description,
            amount: data.amount,
            date: new Date(data.date)
          }
        });

        return {
          transferGroupId,
          sourceTransaction: this.mapToEntity(sourceTransaction),
          destinationTransaction: this.mapToEntity(destinationTransaction)
        };
      })
      .catch(() => null);
  }

  async update(transactionId: string, data: UpdateTransactionData): Promise<Transaction> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUniqueOrThrow({
        where: { id: transactionId }
      });

      const nextCardId = data.cardId !== undefined ? data.cardId : existing.cardId;
      const nextType = data.type !== undefined ? data.type : existing.type;
      const nextAmount = data.amount !== undefined ? data.amount : existing.amount;
      const nextDateYmd = data.date
        ? data.date.slice(0, 10)
        : ymdFromUtcDate(existing.date);

      const invoiceId = await this.reassignInvoiceForExisting(
        tx,
        existing,
        {
          cardId: nextCardId,
          type: nextType,
          amount: nextAmount,
          dateYmd: nextDateYmd
        }
      );

      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          accountId: data.accountId,
          categoryId: data.categoryId,
          cardId: data.cardId,
          invoiceId,
          description: data.description,
          type: data.type,
          amount: data.amount,
          date: data.date ? this.utcDayStart(data.date) : undefined,
          competenceDate:
            data.competenceDate === undefined
              ? undefined
              : data.competenceDate === null
                ? null
                : this.utcDayStart(data.competenceDate.slice(0, 10))
        },
        include: transactionDetailInclude
      });

      return this.mapToEntity(transaction);
    });
  }

  async findBySeriesFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number
  ): Promise<Transaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: {
        seriesId,
        occurrenceNumber: { gte: fromOccurrenceNumber }
      },
      include: transactionDetailInclude,
      orderBy: { occurrenceNumber: 'asc' }
    });

    return rows.map((row) => this.mapToEntity(row));
  }

  async updateManyFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number,
    data: UpdateTransactionData
  ): Promise<Transaction[]> {
    return await this.prisma.$transaction(async (tx) => {
      const targets = await tx.transaction.findMany({
        where: {
          seriesId,
          occurrenceNumber: { gte: fromOccurrenceNumber }
        },
        orderBy: { occurrenceNumber: 'asc' }
      });

      const updated: Transaction[] = [];

      for (const target of targets) {
        const offset =
          target.occurrenceNumber !== null && data.date !== undefined
            ? target.occurrenceNumber - fromOccurrenceNumber
            : 0;

        let nextDate: Date = target.date;
        if (data.date !== undefined) {
          if (offset === 0) {
            nextDate = this.utcDayStart(data.date);
          } else {
            const anchorDay = parseYmd(data.date).day;
            nextDate = this.utcDayStart(addMonthsPreserveDay(data.date, offset, anchorDay));
          }
        }

        const nextCardId = data.cardId !== undefined ? data.cardId : target.cardId;
        const nextType = data.type !== undefined ? data.type : target.type;
        const nextAmount = data.amount !== undefined ? data.amount : target.amount;
        const nextDateYmd = ymdFromUtcDate(nextDate);

        const invoiceId = await this.reassignInvoiceForExisting(
          tx,
          target,
          {
            cardId: nextCardId,
            type: nextType,
            amount: nextAmount,
            dateYmd: nextDateYmd
          }
        );

        const row = await tx.transaction.update({
          where: { id: target.id },
          data: {
            accountId: data.accountId,
            categoryId: data.categoryId,
            cardId: data.cardId,
            invoiceId,
            description: data.description,
            type: data.type,
            amount: data.amount,
            date: nextDate
          },
          include: transactionDetailInclude
        });

        updated.push(this.mapToEntity(row));
      }

      if (
        data.accountId !== undefined ||
        data.categoryId !== undefined ||
        data.cardId !== undefined ||
        data.description !== undefined ||
        data.type !== undefined ||
        data.amount !== undefined ||
        (data.date !== undefined && fromOccurrenceNumber === 1)
      ) {
        await tx.transactionSeries.update({
          where: { id: seriesId },
          data: {
            ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
            ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
            ...(data.cardId !== undefined ? { cardId: data.cardId } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.type !== undefined ? { transactionType: data.type } : {}),
            ...(data.amount !== undefined ? { amount: data.amount } : {}),
            ...(data.date !== undefined && fromOccurrenceNumber === 1
              ? {
                  anchorDate: this.utcDayStart(data.date),
                  anchorDay: Number(data.date.split('-')[2] ?? 1)
                }
              : {})
          }
        });
      }

      return updated;
    });
  }

  async updateIsPaid(transactionId: string, isPaid: boolean): Promise<Transaction> {
    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { isPaid },
      include: transactionDetailInclude
    });

    return this.mapToEntity(transaction);
  }

  async delete(transactionId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findUnique({
        where: { id: transactionId }
      });
      if (!existing) {
        return;
      }
      await detachTransactionFromInvoice(tx, existing.invoiceId, existing.amount);
      await tx.transaction.delete({
        where: { id: transactionId }
      });
    });
  }

  async deleteFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number
  ): Promise<{ deleted: Transaction[]; endedSeries: boolean }> {
    return await this.prisma.$transaction(async (tx) => {
      const targets = await tx.transaction.findMany({
        where: {
          seriesId,
          occurrenceNumber: { gte: fromOccurrenceNumber }
        },
        include: transactionDetailInclude
      });

      const deleted = targets.map((item) => this.mapToEntity(item));

      for (const target of targets) {
        await detachTransactionFromInvoice(tx, target.invoiceId, target.amount);
      }

      await tx.transaction.deleteMany({
        where: {
          seriesId,
          occurrenceNumber: { gte: fromOccurrenceNumber }
        }
      });

      await tx.transactionSeries.update({
        where: { id: seriesId },
        data: {
          isActive: false,
          nextOccurrenceNumber: fromOccurrenceNumber
        }
      });

      return { deleted, endedSeries: true };
    });
  }

  async deleteTransferPair(transferGroupId: string, userId: string): Promise<boolean> {
    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findMany({
        where: {
          transferGroupId,
          userId
        }
      });

      if (existing.length !== 2) {
        return false;
      }

      const source = existing.find((item) => item.type === TransactionType.EXPENSE);
      const destination = existing.find((item) => item.type === TransactionType.INCOME);

      if (!source || !destination || !source.accountId || !destination.accountId) {
        return false;
      }

      await tx.account.update({
        where: { id: source.accountId, userId },
        data: { balance: { increment: source.amount } }
      });

      await tx.account.update({
        where: { id: destination.accountId, userId },
        data: { balance: { decrement: destination.amount } }
      });

      await tx.transaction.deleteMany({
        where: {
          transferGroupId,
          userId
        }
      });

      return true;
    });
  }

  async findSeriesById(seriesId: string): Promise<TransactionSeriesRecord | null> {
    const series = await this.prisma.transactionSeries.findUnique({
      where: { id: seriesId }
    });

    if (!series) {
      return null;
    }

    return this.mapSeries(series);
  }

  async findActiveRecurringSeries(limit = 200): Promise<TransactionSeriesRecord[]> {
    const rows = await this.prisma.transactionSeries.findMany({
      where: {
        isActive: true,
        type: TransactionSeriesType.RECURRING
      },
      orderBy: { updatedAt: 'asc' },
      take: limit
    });

    return rows.map((row) => this.mapSeries(row));
  }

  async appendSeriesOccurrences(
    seriesId: string,
    occurrences: SeriesOccurrenceInput[],
    nextOccurrenceNumber: number
  ): Promise<number> {
    if (occurrences.length === 0) {
      return 0;
    }

    const series = await this.prisma.transactionSeries.findUnique({
      where: { id: seriesId }
    });

    if (!series || !series.isActive) {
      return 0;
    }

    let createdCount = 0;

    await this.prisma.$transaction(async (tx) => {
      const card = await this.loadInvoiceCard(tx, series.cardId);
      const dateToInvoiceId =
        card && series.transactionType === TransactionType.EXPENSE
          ? await ensureInvoicesForDates(
              tx,
              card,
              occurrences.map((occurrence) => occurrence.date)
            )
          : new Map<string, string>();
      const amountByInvoice = new Map<string, number>();

      for (const occurrence of occurrences) {
        try {
          const dateYmd = occurrence.date.slice(0, 10);
          const invoiceId = dateToInvoiceId.get(dateYmd) ?? null;

          await tx.transaction.create({
            data: {
              userId: series.userId,
              accountId: series.accountId,
              categoryId: series.categoryId,
              cardId: series.cardId,
              invoiceId,
              description: series.description,
              type: series.transactionType,
              amount: series.amount,
              date: this.utcDayStart(occurrence.date),
              isPaid: occurrence.isPaid,
              isProjected: occurrence.isProjected,
              seriesId: series.id,
              occurrenceNumber: occurrence.occurrenceNumber
            }
          });
          createdCount += 1;
          if (invoiceId) {
            amountByInvoice.set(
              invoiceId,
              (amountByInvoice.get(invoiceId) ?? 0) + series.amount
            );
          }
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            continue;
          }
          throw error;
        }
      }

      for (const [invoiceId, amount] of amountByInvoice) {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { amount: { increment: amount } }
        });
      }

      await tx.transactionSeries.update({
        where: { id: seriesId },
        data: { nextOccurrenceNumber }
      });
    });

    return createdCount;
  }

  async activateDueProjected(todayYmd: string): Promise<number> {
    const result = await this.prisma.transaction.updateMany({
      where: {
        isProjected: true,
        date: { lte: this.utcDayStart(todayYmd) }
      },
      data: {
        isProjected: false
      }
    });

    return result.count;
  }
}

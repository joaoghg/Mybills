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
  CreateTransferData,
  CreateTransferResult
} from '../../contracts/create-transfer-data.contract';
import { TransferPair } from '../../contracts/transfer-pair.contract';
import { TransactionSeriesRecord } from '../../contracts/transaction-series-record.contract';
import { UpdateTransferData } from '../../contracts/update-transfer-data.contract';
import { CreateTransactionData } from '../../contracts/create-transaction-data.contract';
import { UpdateTransactionData } from '../../contracts/update-transaction-data.contract';
import { Transaction } from '../../entities/transaction.entity';
import { addMonthsPreserveDay, parseYmd } from '../../lib/monthly-schedule';
import { TransactionRepository } from '../transaction.repository';

type PrismaTransactionWithSeries = PrismaTransaction & {
  series?: Pick<PrismaTransactionSeries, 'type' | 'totalOccurrences'> | null;
};

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
    return {
      id: transaction.id,
      userId: transaction.userId,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      cardId: transaction.cardId,
      transferGroupId: transaction.transferGroupId,
      seriesId: transaction.seriesId,
      occurrenceNumber: transaction.occurrenceNumber,
      seriesType: transaction.series?.type ?? null,
      seriesTotalOccurrences: transaction.series?.totalOccurrences ?? null,
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date.toISOString(),
      isPaid: transaction.isPaid,
      isProjected: transaction.isProjected,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
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
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      },
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
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      }
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
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      }
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
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: data.userId,
        accountId: data.accountId,
        categoryId: data.categoryId,
        cardId: data.cardId,
        description: data.description,
        type: data.type,
        amount: data.amount,
        date: new Date(data.date),
        isPaid: data.isPaid,
        isProjected: false
      },
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      }
    });

    return this.mapToEntity(transaction);
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

      const created = await Promise.all(
        data.occurrences.map((occurrence) =>
          tx.transaction.create({
            data: {
              userId: data.userId,
              accountId: data.accountId ?? null,
              categoryId: data.categoryId ?? null,
              cardId: data.cardId ?? null,
              description: data.description ?? null,
              type: data.transactionType,
              amount: data.amount,
              date: this.utcDayStart(occurrence.date),
              isPaid: occurrence.isPaid,
              isProjected: occurrence.isProjected,
              seriesId: series.id,
              occurrenceNumber: occurrence.occurrenceNumber
            }
          })
        )
      );

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
    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        accountId: data.accountId,
        categoryId: data.categoryId,
        cardId: data.cardId,
        description: data.description,
        type: data.type,
        amount: data.amount,
        date: data.date ? this.utcDayStart(data.date) : undefined
      },
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      }
    });

    return this.mapToEntity(transaction);
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
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      },
      orderBy: { occurrenceNumber: 'asc' }
    });

    return rows.map((row) => this.mapToEntity(row));
  }

  async updateManyFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number,
    data: UpdateTransactionData
  ): Promise<Transaction[]> {
    const targets = await this.prisma.transaction.findMany({
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

      let nextDate: Date | undefined;
      if (data.date !== undefined) {
        if (offset === 0) {
          nextDate = this.utcDayStart(data.date);
        } else {
          const anchorDay = parseYmd(data.date).day;
          nextDate = this.utcDayStart(addMonthsPreserveDay(data.date, offset, anchorDay));
        }
      }

      const row = await this.prisma.transaction.update({
        where: { id: target.id },
        data: {
          accountId: data.accountId,
          categoryId: data.categoryId,
          cardId: data.cardId,
          description: data.description,
          type: data.type,
          amount: data.amount,
          date: nextDate
        },
        include: {
          series: {
            select: {
              type: true,
              totalOccurrences: true
            }
          }
        }
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
      await this.prisma.transactionSeries.update({
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
  }

  async updateIsPaid(transactionId: string, isPaid: boolean): Promise<Transaction> {
    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { isPaid },
      include: {
        series: {
          select: {
            type: true,
            totalOccurrences: true
          }
        }
      }
    });

    return this.mapToEntity(transaction);
  }

  async delete(transactionId: string): Promise<void> {
    await this.prisma.transaction.delete({
      where: { id: transactionId }
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
        include: {
          series: {
            select: {
              type: true,
              totalOccurrences: true
            }
          }
        }
      });

      const deleted = targets.map((item) => this.mapToEntity(item));

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
      for (const occurrence of occurrences) {
        try {
          await tx.transaction.create({
            data: {
              userId: series.userId,
              accountId: series.accountId,
              categoryId: series.categoryId,
              cardId: series.cardId,
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

import { Injectable } from '@nestjs/common';
import type { ListTransactionsQueryInput } from '@mybills/dtos';
import {
  Prisma,
  Transaction as PrismaTransaction,
  TransactionType
} from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { CreateTransferData } from '../../contracts/create-transfer-data.contract';
import { CreateTransactionData } from '../../contracts/create-transaction-data.contract';
import { UpdateTransactionData } from '../../contracts/update-transaction-data.contract';
import { Transaction } from '../../entities/transaction.entity';
import { TransactionRepository } from '../transaction.repository';

@Injectable()
export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(transaction: PrismaTransaction): Transaction {
    return {
      id: transaction.id,
      userId: transaction.userId,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      cardId: transaction.cardId,
      transferGroupId: transaction.transferGroupId,
      description: transaction.description,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date.toISOString(),
      isPaid: transaction.isPaid,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString()
    };
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
    }

    if (filters.type !== undefined) {
      where.type = filters.type;
    } else if (filters.includeTransfer === false) {
      where.type = { in: [TransactionType.INCOME, TransactionType.EXPENSE] };
    }

    if (filters.categoryId !== undefined) {
      where.categoryId = filters.categoryId;
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
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    });

    return transactions.map((transaction) => this.mapToEntity(transaction));
  }

  async findByIdAndUserId(transactionId: string, userId: string): Promise<Transaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId
      }
    });

    if (!transaction) {
      return null;
    }

    return this.mapToEntity(transaction);
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
        isPaid: data.isPaid
      }
    });

    return this.mapToEntity(transaction);
  }

  async createTransferPair(data: CreateTransferData) {
    return await this.prisma.$transaction(async (tx) => {
      const sourceAccount = await tx.account.update({
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
          isPaid: true
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
          isPaid: true
        }
      });

      return {
        transferGroupId: data.transferGroupId,
        sourceTransaction: this.mapToEntity(sourceTransaction),
        destinationTransaction: this.mapToEntity(destinationTransaction)
      };
    }).catch(() => null);
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
        date: data.date ? new Date(data.date) : undefined
      }
    });

    return this.mapToEntity(transaction);
  }

  async updateIsPaid(transactionId: string, isPaid: boolean): Promise<Transaction> {
    const transaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { isPaid }
    });

    return this.mapToEntity(transaction);
  }

  async delete(transactionId: string): Promise<void> {
    await this.prisma.transaction.delete({
      where: { id: transactionId }
    });
  }
}

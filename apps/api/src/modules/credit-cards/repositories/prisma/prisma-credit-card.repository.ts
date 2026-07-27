import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { CreditCardRepository } from '../credit-card.repository';
import { CreditCard } from '../../entities/credit-card.entity';
import { CreditCard as PrismaCreditCard, TransactionType } from 'src/generated/prisma/client';
import { CreateCreditCardData } from '../../contracts/create-credit-card-data.contract';
import {
  PayInvoiceData,
  PayInvoiceResult
} from '../../contracts/pay-invoice-data.contract';
import { UpdateCreditCardData } from '../../contracts/update-credit-card-data.contract';

@Injectable()
export class PrismaCreditCardRepository implements CreditCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(creditCard: PrismaCreditCard, usedAmount: number): CreditCard {
    return {
      id: creditCard.id,
      userId: creditCard.userId,
      accountId: creditCard.accountId,
      name: creditCard.name,
      limit: creditCard.limit,
      closingDay: creditCard.closingDay,
      dueDay: creditCard.dueDay,
      usedAmount,
      createdAt: creditCard.createdAt.toISOString(),
      updatedAt: creditCard.updatedAt.toISOString()
    };
  }

  private async sumUsedAmountByCardIds(
    userId: string,
    cardIds: string[]
  ): Promise<Map<string, number>> {
    const usedByCardId = new Map<string, number>();

    if (cardIds.length === 0) {
      return usedByCardId;
    }

    const aggregates = await this.prisma.transaction.groupBy({
      by: ['cardId'],
      where: {
        userId,
        cardId: { in: cardIds },
        type: TransactionType.EXPENSE,
        isPaid: false
      },
      _sum: { amount: true }
    });

    for (const row of aggregates) {
      if (row.cardId === null) {
        continue;
      }

      usedByCardId.set(row.cardId, row._sum.amount ?? 0);
    }

    return usedByCardId;
  }

  private async sumUsedAmountForCard(userId: string, cardId: string): Promise<number> {
    const aggregate = await this.prisma.transaction.aggregate({
      where: {
        userId,
        cardId,
        type: TransactionType.EXPENSE,
        isPaid: false
      },
      _sum: { amount: true }
    });

    return aggregate._sum.amount ?? 0;
  }

  async findAllByUserId(userId: string): Promise<CreditCard[]> {
    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    const usedByCardId = await this.sumUsedAmountByCardIds(
      userId,
      creditCards.map((creditCard) => creditCard.id)
    );

    return creditCards.map((creditCard) =>
      this.mapToEntity(creditCard, usedByCardId.get(creditCard.id) ?? 0)
    );
  }

  async findByIdAndUserId(creditCardId: string, userId: string): Promise<CreditCard | null> {
    const creditCard = await this.prisma.creditCard.findFirst({
      where: {
        id: creditCardId,
        userId
      }
    });

    if (!creditCard) {
      return null;
    }

    const usedAmount = await this.sumUsedAmountForCard(userId, creditCardId);

    return this.mapToEntity(creditCard, usedAmount);
  }

  async create(data: CreateCreditCardData): Promise<CreditCard> {
    const creditCard = await this.prisma.creditCard.create({
      data: {
        userId: data.userId,
        accountId: data.accountId ?? null,
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay
      }
    });

    return this.mapToEntity(creditCard, 0);
  }

  async update(creditCardId: string, data: UpdateCreditCardData): Promise<CreditCard> {
    const creditCard = await this.prisma.creditCard.update({
      where: { id: creditCardId },
      data: {
        accountId: data.accountId,
        name: data.name,
        limit: data.limit,
        closingDay: data.closingDay,
        dueDay: data.dueDay
      }
    });

    const usedAmount = await this.sumUsedAmountForCard(creditCard.userId, creditCardId);

    return this.mapToEntity(creditCard, usedAmount);
  }

  async delete(creditCardId: string): Promise<void> {
    await this.prisma.creditCard.delete({
      where: { id: creditCardId }
    });
  }

  private utcDayStart(ymd: string): Date {
    const parts = ymd.split('-');
    const year = Number(parts[0] ?? 0);
    const month = Number(parts[1] ?? 1);
    const day = Number(parts[2] ?? 1);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private utcDayAfter(ymd: string): Date {
    const start = this.utcDayStart(ymd);
    return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
  }

  async payInvoice(data: PayInvoiceData): Promise<PayInvoiceResult | null> {
    return await this.prisma.$transaction(async (tx) => {
      const unpaid = await tx.transaction.findMany({
        where: {
          userId: data.userId,
          cardId: data.creditCardId,
          type: TransactionType.EXPENSE,
          isPaid: false,
          date: {
            gte: this.utcDayStart(data.cycleStart),
            lt: this.utcDayAfter(data.cycleEnd)
          }
        },
        select: { id: true, amount: true }
      });

      if (unpaid.length === 0) {
        return null;
      }

      const amount = unpaid.reduce((sum, transaction) => sum + transaction.amount, 0);

      const payment = await tx.transaction.create({
        data: {
          userId: data.userId,
          accountId: data.accountId,
          cardId: null,
          description: data.description,
          type: TransactionType.EXPENSE,
          amount,
          date: new Date(data.paymentDate),
          isPaid: true
        }
      });

      await tx.transaction.updateMany({
        where: {
          id: { in: unpaid.map((transaction) => transaction.id) }
        },
        data: { isPaid: true }
      });

      await tx.account.update({
        where: {
          id: data.accountId,
          userId: data.userId
        },
        data: {
          balance: { decrement: amount }
        }
      });

      return {
        amount,
        accountId: data.accountId,
        paymentTransactionId: payment.id,
        paidCount: unpaid.length,
        cycleStart: data.cycleStart,
        cycleEnd: data.cycleEnd
      };
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { CreditCardRepository } from '../credit-card.repository';
import { CreditCard } from '../../entities/credit-card.entity';
import { CreditCard as PrismaCreditCard } from 'src/generated/prisma/client';
import { CreateCreditCardData } from '../../contracts/create-credit-card-data.contract';
import { UpdateCreditCardData } from '../../contracts/update-credit-card-data.contract';

@Injectable()
export class PrismaCreditCardRepository implements CreditCardRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(creditCard: PrismaCreditCard): CreditCard {
    return {
      id: creditCard.id,
      userId: creditCard.userId,
      accountId: creditCard.accountId,
      name: creditCard.name,
      limit: creditCard.limit,
      closingDay: creditCard.closingDay,
      dueDay: creditCard.dueDay,
      createdAt: creditCard.createdAt.toISOString(),
      updatedAt: creditCard.updatedAt.toISOString()
    };
  }

  async findAllByUserId(userId: string): Promise<CreditCard[]> {
    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return creditCards.map((creditCard) => this.mapToEntity(creditCard));
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

    return this.mapToEntity(creditCard);
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

    return this.mapToEntity(creditCard);
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

    return this.mapToEntity(creditCard);
  }

  async delete(creditCardId: string): Promise<void> {
    await this.prisma.creditCard.delete({
      where: { id: creditCardId }
    });
  }
}

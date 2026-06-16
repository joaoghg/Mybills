import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../account.repository';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { Account } from '../../entities/account.entity';
import { Account as PrismaAccount } from 'src/generated/prisma/client';
import { CreateAccountData } from '../../contracts/create-account-data.contract';
import { UpdateAccountData } from '../../contracts/update-account-data.contract';

@Injectable()
export class PrismaAccountRepository implements AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(account: PrismaAccount): Account {
    return {
      id: account.id,
      name: account.name,
      balance: account.balance,
      userId: account.userId,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    };
  }

  async findAllByUserId(userId: string): Promise<Account[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return accounts.map((account) => this.mapToEntity(account));
  }

  async findByIdAndUserId(accountId: string, userId: string): Promise<Account | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        userId
      }
    });

    if (!account) {
      return null;
    }

    return this.mapToEntity(account);
  }

  async create(data: CreateAccountData): Promise<Account> {
    const account = await this.prisma.account.create({
      data: {
        name: data.name,
        balance: data.balance,
        userId: data.userId
      }
    });

    return this.mapToEntity(account);
  }

  async update(accountId: string, data: UpdateAccountData): Promise<Account> {
    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        name: data.name,
        balance: data.balance
      }
    });

    return this.mapToEntity(account);
  }

  async delete(accountId: string): Promise<void> {
    await this.prisma.account.delete({
      where: { id: accountId }
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { UserRepository } from '../user.repository';
import { User } from '../../entities/user.entity';
import { User as PrismaUser } from 'src/generated/prisma/client';
import { CreateUserData } from '../../contracts/create-user-data.contract';
import { UpdateUserData } from '../../contracts/update-user-data.contract';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(user: PrismaUser): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      refreshToken: user.refreshToken,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }

  async findAll(): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return users.map((user) => this.mapToEntity(user));
  }

  async findById(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return null;
    }

    return this.mapToEntity(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return null;
    }

    return this.mapToEntity(user);
  }

  async updateRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken }
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.hashedPassword
      }
    });

    return this.mapToEntity(user);
  }

  async update(userId: string, data: UpdateUserData): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        email: data.email
      }
    });

    return this.mapToEntity(user);
  }

  async delete(userId: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id: userId }
    });
  }
}

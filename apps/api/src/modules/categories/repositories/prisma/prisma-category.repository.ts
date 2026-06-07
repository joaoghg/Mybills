import { Injectable } from '@nestjs/common';
import type { CategoryIcon } from '@mybills/dtos';
import { Category as PrismaCategory } from 'src/generated/prisma/client';
import { PrismaService } from 'src/modules/database/prisma/prisma.service';
import { CreateCategoryData } from '../../contracts/create-category-data.contract';
import { UpdateCategoryData } from '../../contracts/update-category-data.contract';
import { Category } from '../../entities/category.entity';
import { CategoryRepository } from '../category.repository';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(category: PrismaCategory): Category {
    return {
      id: category.id,
      userId: category.userId,
      name: category.name,
      icon: category.icon as CategoryIcon,
      types: category.types,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString()
    };
  }

  async findAllByUserId(userId: string): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    return categories.map((category) => this.mapToEntity(category));
  }

  async findByIdAndUserId(categoryId: string, userId: string): Promise<Category | null> {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId
      }
    });

    if (!category) {
      return null;
    }

    return this.mapToEntity(category);
  }

  async findByNameAndUserId(name: string, userId: string): Promise<Category | null> {
    const category = await this.prisma.category.findFirst({
      where: {
        name,
        userId
      }
    });

    if (!category) {
      return null;
    }

    return this.mapToEntity(category);
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const category = await this.prisma.category.create({
      data: {
        userId: data.userId,
        name: data.name,
        icon: data.icon,
        types: data.types
      }
    });

    return this.mapToEntity(category);
  }

  async update(categoryId: string, data: UpdateCategoryData): Promise<Category> {
    const category = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        icon: data.icon,
        types: data.types
      }
    });

    return this.mapToEntity(category);
  }

  async delete(categoryId: string): Promise<void> {
    await this.prisma.category.delete({
      where: { id: categoryId }
    });
  }
}

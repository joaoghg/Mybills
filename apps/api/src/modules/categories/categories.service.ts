import { Inject, Injectable } from '@nestjs/common';
import { AlreadyExistsError } from 'src/common/errors/already-exists.error';
import { InvalidArgumentError } from 'src/common/errors/invalid-argument.error';
import { NotFoundError } from 'src/common/errors/not-found.error';
import { CategoryRepository } from './repositories/category.repository';
import { Category } from './entities/category.entity';
import { CreateCategoryData } from './contracts/create-category-data.contract';
import { UpdateCategoryData } from './contracts/update-category-data.contract';

@Injectable()
export class CategoriesService {
  constructor(@Inject('CategoryRepository') private readonly repository: CategoryRepository) {}

  async findAll(userId: string): Promise<Category[]> {
    this.validateUserId(userId);

    return await this.repository.findAllByUserId(userId);
  }

  async findById(categoryId: string, userId: string): Promise<Category> {
    this.validateCategoryId(categoryId);
    this.validateUserId(userId);

    const category = await this.repository.findByIdAndUserId(categoryId, userId);

    if (!category) {
      throw new NotFoundError({
        code: 'categories.category_not_found',
        i18nKey: 'errors.not_found.resource',
        i18nArgs: { resource: 'category' }
      });
    }

    return category;
  }

  async create(data: CreateCategoryData): Promise<Category> {
    this.validateCreateData(data);

    const normalizedName = data.name.trim();
    const existingCategory = await this.repository.findByNameAndUserId(normalizedName, data.userId);

    if (existingCategory) {
      throw new AlreadyExistsError({
        code: 'categories.category_already_exists',
        i18nKey: 'errors.categories.category_already_exists'
      });
    }

    return await this.repository.create({
      userId: data.userId,
      name: normalizedName,
      icon: data.icon
    });
  }

  async update(categoryId: string, userId: string, data: UpdateCategoryData): Promise<Category> {
    this.validateCategoryId(categoryId);
    this.validateUserId(userId);
    this.validateUpdateData(data);

    await this.findById(categoryId, userId);

    let normalizedName: string | undefined;

    if (data.name !== undefined) {
      normalizedName = data.name.trim();

      const existingCategory = await this.repository.findByNameAndUserId(normalizedName, userId);

      if (existingCategory && existingCategory.id !== categoryId) {
        throw new AlreadyExistsError({
          code: 'categories.category_already_exists',
          i18nKey: 'errors.categories.category_already_exists'
        });
      }
    }

    return await this.repository.update(categoryId, {
      name: normalizedName,
      icon: data.icon
    });
  }

  async remove(categoryId: string, userId: string): Promise<void> {
    this.validateCategoryId(categoryId);
    this.validateUserId(userId);

    await this.findById(categoryId, userId);
    await this.repository.delete(categoryId);
  }

  private validateCreateData(data: CreateCategoryData): void {
    this.validateUserId(data.userId);

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      throw new InvalidArgumentError({
        code: 'categories.invalid_category_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'category_name' }
      });
    }
  }

  private validateUpdateData(data: UpdateCategoryData): void {
    if (data.name === undefined && data.icon === undefined) {
      throw new InvalidArgumentError({
        code: 'categories.at_least_one_field_required',
        i18nKey: 'errors.validation.at_least_one_field_required'
      });
    }

    if (
      data.name !== undefined &&
      (!data.name || typeof data.name !== 'string' || !data.name.trim())
    ) {
      throw new InvalidArgumentError({
        code: 'categories.invalid_category_name',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'category_name' }
      });
    }
  }

  private validateCategoryId(categoryId: string): void {
    if (!categoryId || typeof categoryId !== 'string') {
      throw new InvalidArgumentError({
        code: 'categories.invalid_category_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'category_id' }
      });
    }
  }

  private validateUserId(userId: string): void {
    if (!userId || typeof userId !== 'string') {
      throw new InvalidArgumentError({
        code: 'categories.invalid_user_id',
        i18nKey: 'errors.validation.invalid_field',
        i18nArgs: { field: 'user_id' }
      });
    }
  }
}

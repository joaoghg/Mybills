import { CreateCategoryData } from '../contracts/create-category-data.contract';
import { UpdateCategoryData } from '../contracts/update-category-data.contract';
import { Category } from '../entities/category.entity';

export interface CategoryRepository {
  findAllByUserId(userId: string): Promise<Category[]>;
  findByIdAndUserId(categoryId: string, userId: string): Promise<Category | null>;
  findByNameAndUserId(name: string, userId: string): Promise<Category | null>;
  findSystemTransferByUserId(userId: string): Promise<Category | null>;
  create(data: CreateCategoryData): Promise<Category>;
  update(categoryId: string, data: UpdateCategoryData): Promise<Category>;
  delete(categoryId: string): Promise<void>;
}
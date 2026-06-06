import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory
} from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type {
  CategoryOutput,
  CreateCategoryInput,
  ListCategoriesOutput,
  UpdateCategoryInput
} from '@mybills/dtos';

export function fetchUserCategories(client: HttpClient): Promise<ListCategoriesOutput> {
  return listCategories(client);
}

export function createUserCategory(
  client: HttpClient,
  input: CreateCategoryInput
): Promise<CategoryOutput> {
  return createCategory(client, input);
}

export function updateUserCategory(
  client: HttpClient,
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategoryOutput> {
  return updateCategory(client, categoryId, input);
}

export function deleteUserCategory(client: HttpClient, categoryId: string): Promise<void> {
  return deleteCategory(client, categoryId);
}

import type { CategoryIcon, CategoryTransactionType } from '@mybills/dtos';

export interface CreateCategoryData {
  userId: string;
  name: string;
  icon: CategoryIcon;
  isSystem?: boolean;
  types: CategoryTransactionType[];
}
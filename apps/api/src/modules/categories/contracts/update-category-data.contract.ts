import type { CategoryIcon, CategoryTransactionType } from '@mybills/dtos';

export interface UpdateCategoryData {
  name?: string;
  icon?: CategoryIcon;
  types?: CategoryTransactionType[];
}
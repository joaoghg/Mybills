import type { CategoryIcon } from '@mybills/dtos';

export interface CreateCategoryData {
  userId: string;
  name: string;
  icon: CategoryIcon;
  isSystem?: boolean;
}
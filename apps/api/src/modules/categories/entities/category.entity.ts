import type { CategoryIcon, CategoryTransactionType } from '@mybills/dtos';

export class Category {
  id: string;
  userId: string;
  name: string;
  icon: CategoryIcon;
  isSystem: boolean;
  types: CategoryTransactionType[];
  createdAt: string;
  updatedAt: string;
}
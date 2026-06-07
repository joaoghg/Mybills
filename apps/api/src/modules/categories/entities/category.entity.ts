import type { CategoryIcon, CategoryTransactionType } from '@mybills/dtos';

export class Category {
  id: string;
  userId: string;
  name: string;
  icon: CategoryIcon;
  types: CategoryTransactionType[];
  createdAt: string;
  updatedAt: string;
}
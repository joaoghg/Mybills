import type { CategoryIcon } from '@mybills/dtos';

export class Category {
  id: string;
  userId: string;
  name: string;
  icon: CategoryIcon;
  createdAt: string;
  updatedAt: string;
}
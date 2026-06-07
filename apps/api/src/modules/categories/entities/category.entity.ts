import type { CategoryIcon } from '@mybills/dtos';

export class Category {
  id: string;
  userId: string;
  name: string;
  icon: CategoryIcon;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}
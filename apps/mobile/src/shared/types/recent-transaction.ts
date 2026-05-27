import type { CategoryIcon } from '@mybills/dtos';

export type RecentAmountVariant = 'expense' | 'income' | 'neutral';

export type RecentTransactionRow = {
  id: string;
  merchant: string;
  timeLabel: string;
  displayAmountMajor: number;
  amountVariant: RecentAmountVariant;
  iconName: CategoryIcon;
};

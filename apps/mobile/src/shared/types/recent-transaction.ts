export type RecentAmountVariant = 'expense' | 'income' | 'neutral';

export type RecentTransactionRow = {
  id: string;
  merchant: string;
  timeLabel: string;
  displayAmountMajor: number;
  amountVariant: RecentAmountVariant;
  iconName: 'cart-outline' | 'restaurant-outline' | 'receipt-outline';
};

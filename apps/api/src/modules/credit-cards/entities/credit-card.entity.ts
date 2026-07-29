export class CreditCard {
  id: string;
  userId: string;
  accountId: string | null;
  name: string;
  limit: number;
  closingDay: number;
  closingOnLastDay: boolean;
  dueDay: number;
  usedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export class CreditCard {
  id: string;
  userId: string;
  accountId: string | null;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  createdAt: string;
  updatedAt: string;
}
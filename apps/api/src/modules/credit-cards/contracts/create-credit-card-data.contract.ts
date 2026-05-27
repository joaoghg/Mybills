export interface CreateCreditCardData {
  accountId?: string | null;
  userId: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}
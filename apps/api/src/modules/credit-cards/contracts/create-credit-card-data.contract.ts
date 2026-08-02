export interface CreateCreditCardData {
  accountId?: string | null;
  userId: string;
  name: string;
  limit: number;
  closingDay?: number;
  closingOnLastDay?: boolean;
  dueDay: number;
}

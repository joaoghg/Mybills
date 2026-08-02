export interface UpdateCreditCardData {
  accountId?: string | null;
  name?: string;
  limit?: number;
  closingDay?: number;
  closingOnLastDay?: boolean;
  dueDay?: number;
}

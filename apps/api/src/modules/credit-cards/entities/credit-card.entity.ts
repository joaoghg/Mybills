export type OpenInvoiceSummary = {
  id: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  status: 'OPEN' | 'CLOSED' | 'PAID';
  amount: number;
};

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
  openInvoice: OpenInvoiceSummary | null;
  createdAt: string;
  updatedAt: string;
}

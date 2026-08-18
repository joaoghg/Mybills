export type InvoiceRecord = {
  id: string;
  userId: string;
  creditCardId: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  status: 'OPEN' | 'CLOSED' | 'PAID';
  amount: number;
  paidAt: string | null;
  paidAmount: number | null;
  paymentTransactionId: string | null;
  paidFromAccountId: string | null;
  createdAt: string;
  updatedAt: string;
};

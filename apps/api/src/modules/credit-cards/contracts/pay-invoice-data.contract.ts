export type PayInvoiceData = {
  userId: string;
  creditCardId: string;
  accountId: string;
  cycleStart: string;
  cycleEnd: string;
  paymentDate: string;
  description: string;
};

export type PayInvoiceResult = {
  amount: number;
  accountId: string;
  paymentTransactionId: string;
  paidCount: number;
  cycleStart: string;
  cycleEnd: string;
};

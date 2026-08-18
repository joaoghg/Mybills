export type PayInvoiceData = {
  userId: string;
  creditCardId: string;
  accountId: string;
  invoiceId: string;
  paymentDate: string;
  description: string;
};

export type PayInvoiceResult = {
  amount: number;
  accountId: string;
  paymentTransactionId: string;
  paidCount: number;
  invoiceId: string;
  cycleStart: string;
  cycleEnd: string;
};

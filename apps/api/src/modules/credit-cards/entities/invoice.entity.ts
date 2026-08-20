export type InvoicePaymentRecord = {
  id: string;
  amount: number;
  paymentDate: string;
  transactionId: string | null;
};

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
  source: 'MANUAL' | 'PLUGGY';
  currencyCode: string | null;
  closingOn: string | null;
  minimumPaymentAmount: number | null;
  allowsInstallments: boolean | null;
  isFullyPaid: boolean | null;
  isForecast: boolean;
  providerBillId: string | null;
  payments: InvoicePaymentRecord[];
  createdAt: string;
  updatedAt: string;
};

export type OpenInvoiceSummary = {
  id: string;
  startsOn: string;
  endsOn: string;
  dueOn: string;
  status: 'OPEN' | 'CLOSED' | 'PAID';
  amount: number;
  source: 'MANUAL' | 'PLUGGY';
  isForecast: boolean;
  providerBillId: string | null;
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
  source: 'MANUAL' | 'PLUGGY';
  overriddenFields: string[];
  hiddenAt: string | null;
  availableLimit: number | null;
  brand: string | null;
  providerStatus: string | null;
  currencyCode: string | null;
  openInvoice: OpenInvoiceSummary | null;
  createdAt: string;
  updatedAt: string;
}

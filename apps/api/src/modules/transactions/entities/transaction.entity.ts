import { TransactionSeriesType, TransactionType } from 'src/generated/prisma/client';

export class Transaction {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  cardId: string | null;
  invoiceId: string | null;
  transferGroupId: string | null;
  seriesId: string | null;
  occurrenceNumber: number | null;
  seriesType: TransactionSeriesType | null;
  seriesTotalOccurrences: number | null;
  description: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  competenceDate: string | null;
  isPaid: boolean;
  isProjected: boolean;
  invoicePaymentMonth: string | null;
  source: 'MANUAL' | 'PLUGGY';
  overriddenFields: string[];
  hiddenAt: string | null;
  providerStatus: 'POSTED' | 'PENDING' | null;
  currencyCode: string | null;
  cashFlowRole: 'NORMAL' | 'TRANSFER' | 'CARD_PAYMENT' | 'INVESTMENT' | 'IGNORED';
  billForecastMonth: string | null;
  providerCategoryId: string | null;
  providerCategoryName: string | null;
  providerBillId: string | null;
  createdAt: string;
  updatedAt: string;
}

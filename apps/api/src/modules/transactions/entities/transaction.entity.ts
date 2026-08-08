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
  isPaid: boolean;
  isProjected: boolean;
  invoicePaymentMonth: string | null;
  createdAt: string;
  updatedAt: string;
}

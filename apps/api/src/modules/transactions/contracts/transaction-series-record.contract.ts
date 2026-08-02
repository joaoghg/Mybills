import { TransactionSeriesType, TransactionType } from 'src/generated/prisma/client';

export type TransactionSeriesRecord = {
  id: string;
  userId: string;
  type: TransactionSeriesType;
  accountId: string | null;
  categoryId: string | null;
  cardId: string | null;
  description: string | null;
  transactionType: TransactionType;
  amount: number;
  anchorDate: string;
  anchorDay: number;
  totalOccurrences: number | null;
  nextOccurrenceNumber: number;
  isActive: boolean;
};

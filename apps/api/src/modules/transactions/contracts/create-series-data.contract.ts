import { TransactionSeriesType, TransactionType } from 'src/generated/prisma/client';

export type SeriesOccurrenceInput = {
  occurrenceNumber: number;
  date: string;
  isPaid: boolean;
  isProjected: boolean;
};

export type CreateSeriesWithOccurrencesData = {
  userId: string;
  type: TransactionSeriesType;
  accountId?: string | null;
  categoryId?: string | null;
  cardId?: string | null;
  description?: string | null;
  transactionType: TransactionType;
  amount: number;
  anchorDate: string;
  anchorDay: number;
  totalOccurrences: number | null;
  occurrences: SeriesOccurrenceInput[];
};

export type CreateSeriesWithOccurrencesResult = {
  seriesId: string;
  firstTransactionId: string;
};

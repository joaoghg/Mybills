import { UpdateTransactionData } from './update-transaction-data.contract';

export type ConvertSeriesToRecurringData = {
  seriesId: string;
  fromOccurrenceNumber: number;
  fieldUpdates: UpdateTransactionData;
  todayYmd: string;
};

export type ConvertSeriesToInstallmentData = {
  seriesId: string;
  fromOccurrenceNumber: number;
  startDate: string;
  endDate: string;
  /** When set (card invoice months), generate this many occurrences from startDate. */
  occurrenceCount?: number;
  fieldUpdates: UpdateTransactionData;
};

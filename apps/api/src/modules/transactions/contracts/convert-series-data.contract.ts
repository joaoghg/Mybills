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
  /** Number of monthly occurrences to generate from startDate. */
  occurrenceCount: number;
  fieldUpdates: UpdateTransactionData;
};

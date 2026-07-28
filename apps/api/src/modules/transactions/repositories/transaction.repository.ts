import type { ListTransactionsQueryInput } from '@mybills/dtos';
import { CreateTransactionData } from '../contracts/create-transaction-data.contract';
import {
  CreateSeriesWithOccurrencesData,
  CreateSeriesWithOccurrencesResult
} from '../contracts/create-series-data.contract';
import { CreateTransferData, CreateTransferResult } from '../contracts/create-transfer-data.contract';
import { TransferPair } from '../contracts/transfer-pair.contract';
import { TransactionSeriesRecord } from '../contracts/transaction-series-record.contract';
import { UpdateTransferData } from '../contracts/update-transfer-data.contract';
import { UpdateTransactionData } from '../contracts/update-transaction-data.contract';
import { SeriesOccurrenceInput } from '../contracts/create-series-data.contract';
import { Transaction } from '../entities/transaction.entity';

export interface TransactionRepository {
  findAllByUserId(userId: string, filters?: ListTransactionsQueryInput): Promise<Transaction[]>;
  findByIdAndUserId(transactionId: string, userId: string): Promise<Transaction | null>;
  findByTransferGroupIdAndUserId(
    transferGroupId: string,
    userId: string
  ): Promise<TransferPair | null>;
  create(data: CreateTransactionData): Promise<Transaction>;
  createSeriesWithOccurrences(
    data: CreateSeriesWithOccurrencesData
  ): Promise<CreateSeriesWithOccurrencesResult>;
  createTransferPair(data: CreateTransferData): Promise<CreateTransferResult | null>;
  update(transactionId: string, data: UpdateTransactionData): Promise<Transaction>;
  updateManyFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number,
    data: UpdateTransactionData
  ): Promise<Transaction[]>;
  findBySeriesFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number
  ): Promise<Transaction[]>;
  updateIsPaid(transactionId: string, isPaid: boolean): Promise<Transaction>;
  updateTransferPair(
    transferGroupId: string,
    data: UpdateTransferData
  ): Promise<CreateTransferResult | null>;
  delete(transactionId: string): Promise<void>;
  deleteFromOccurrence(
    seriesId: string,
    fromOccurrenceNumber: number
  ): Promise<{ deleted: Transaction[]; endedSeries: boolean }>;
  deleteTransferPair(transferGroupId: string, userId: string): Promise<boolean>;
  findSeriesById(seriesId: string): Promise<TransactionSeriesRecord | null>;
  findActiveRecurringSeries(limit?: number): Promise<TransactionSeriesRecord[]>;
  appendSeriesOccurrences(
    seriesId: string,
    occurrences: SeriesOccurrenceInput[],
    nextOccurrenceNumber: number
  ): Promise<number>;
  activateDueProjected(todayYmd: string): Promise<number>;
}

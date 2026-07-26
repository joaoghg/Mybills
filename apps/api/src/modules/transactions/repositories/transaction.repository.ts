import type { ListTransactionsQueryInput } from '@mybills/dtos';
import { CreateTransactionData } from '../contracts/create-transaction-data.contract';
import { CreateTransferData, CreateTransferResult } from '../contracts/create-transfer-data.contract';
import { TransferPair } from '../contracts/transfer-pair.contract';
import { UpdateTransferData } from '../contracts/update-transfer-data.contract';
import { UpdateTransactionData } from '../contracts/update-transaction-data.contract';
import { Transaction } from '../entities/transaction.entity';

export interface TransactionRepository {
  findAllByUserId(userId: string, filters?: ListTransactionsQueryInput): Promise<Transaction[]>;
  findByIdAndUserId(transactionId: string, userId: string): Promise<Transaction | null>;
  findByTransferGroupIdAndUserId(
    transferGroupId: string,
    userId: string
  ): Promise<TransferPair | null>;
  create(data: CreateTransactionData): Promise<Transaction>;
  createTransferPair(data: CreateTransferData): Promise<CreateTransferResult | null>;
  update(transactionId: string, data: UpdateTransactionData): Promise<Transaction>;
  updateIsPaid(transactionId: string, isPaid: boolean): Promise<Transaction>;
  updateTransferPair(
    transferGroupId: string,
    data: UpdateTransferData
  ): Promise<CreateTransferResult | null>;
  delete(transactionId: string): Promise<void>;
  deleteTransferPair(transferGroupId: string, userId: string): Promise<boolean>;
}

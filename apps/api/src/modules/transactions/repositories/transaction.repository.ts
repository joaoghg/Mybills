import type { ListTransactionsQueryInput } from '@mybills/dtos';
import { CreateTransactionData } from '../contracts/create-transaction-data.contract';
import { UpdateTransactionData } from '../contracts/update-transaction-data.contract';
import { Transaction } from '../entities/transaction.entity';

export interface TransactionRepository {
  findAllByUserId(userId: string, filters?: ListTransactionsQueryInput): Promise<Transaction[]>;
  findByIdAndUserId(transactionId: string, userId: string): Promise<Transaction | null>;
  create(data: CreateTransactionData): Promise<Transaction>;
  update(transactionId: string, data: UpdateTransactionData): Promise<Transaction>;
  updateIsPaid(transactionId: string, isPaid: boolean): Promise<Transaction>;
  delete(transactionId: string): Promise<void>;
}

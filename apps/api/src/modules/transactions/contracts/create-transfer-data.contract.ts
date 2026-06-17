import { Transaction } from '../entities/transaction.entity';

export interface CreateTransferData {
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  categoryId: string;
  transferGroupId: string;
  amount: number;
  date: string;
  description?: string | null;
}

export interface CreateTransferResult {
  transferGroupId: string;
  sourceTransaction: Transaction;
  destinationTransaction: Transaction;
}

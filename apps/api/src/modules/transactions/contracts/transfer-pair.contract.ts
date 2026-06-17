import { Transaction } from '../entities/transaction.entity';

export interface TransferPair {
  sourceTransaction: Transaction;
  destinationTransaction: Transaction;
}

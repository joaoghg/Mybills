import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  updateTransaction,
  updateTransactionIsPaid
} from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type {
  CreateTransactionInput,
  TransactionOutput,
  UpdateTransactionInput,
  UpdateTransactionIsPaidInput
} from '@mybills/dtos';

export function createUserTransaction(
  client: HttpClient,
  input: CreateTransactionInput
): Promise<TransactionOutput> {
  return createTransaction(client, input);
}

export function getUserTransaction(
  client: HttpClient,
  transactionId: string
): Promise<TransactionOutput> {
  return getTransaction(client, transactionId);
}

export function updateUserTransaction(
  client: HttpClient,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<TransactionOutput> {
  return updateTransaction(client, transactionId, input);
}

export function updateUserTransactionIsPaid(
  client: HttpClient,
  transactionId: string,
  input: UpdateTransactionIsPaidInput
): Promise<TransactionOutput> {
  return updateTransactionIsPaid(client, transactionId, input);
}

export function deleteUserTransaction(client: HttpClient, transactionId: string): Promise<void> {
  return deleteTransaction(client, transactionId);
}

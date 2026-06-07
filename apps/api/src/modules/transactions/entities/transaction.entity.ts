import { TransactionType } from 'src/generated/prisma/client';

export class Transaction {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  cardId: string | null;
  transferGroupId: string | null;
  description: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

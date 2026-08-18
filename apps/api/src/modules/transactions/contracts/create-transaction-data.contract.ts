import { TransactionType } from 'src/generated/prisma/client';

export interface CreateTransactionData {
  userId: string;
  accountId?: string | null;
  categoryId?: string | null;
  cardId?: string | null;
  description?: string | null;
  type: TransactionType;
  amount: number;
  date: string;
  competenceDate?: string | null;
  isPaid: boolean;
  schedule?:
    | { mode: 'NONE' }
    | { mode: 'INSTALLMENT'; installments: number }
    | { mode: 'RECURRING' };
}

import z from 'zod';
import { transactionTypeSchema } from '../input/create-transaction-input.dto';

export const transactionOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  accountId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  cardId: z.uuid().nullable(),
  transferGroupId: z.uuid().nullable(),
  description: z.string().nullable(),
  type: transactionTypeSchema,
  amount: z.int(),
  date: z.string(),
  isPaid: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type TransactionOutput = z.infer<typeof transactionOutputSchema>;

import z from 'zod';
import { transactionTypeSchema } from './create-transaction-input.dto';

export const updateTransactionInputSchema = z
  .object({
    accountId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    cardId: z.uuid().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    type: transactionTypeSchema.optional(),
    amount: z.int().positive().optional(),
    date: z.iso.date().optional()
  })
  .refine(
    (data) =>
      data.accountId !== undefined ||
      data.categoryId !== undefined ||
      data.cardId !== undefined ||
      data.description !== undefined ||
      data.type !== undefined ||
      data.amount !== undefined ||
      data.date !== undefined
  );

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

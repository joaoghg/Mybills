import z from 'zod';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);

export const createTransactionInputSchema = z.object({
  accountId: z.uuid().nullable().optional(),
  categoryId: z.uuid().nullable().optional(),
  cardId: z.uuid().nullable().optional(),
  description: z.string().trim().nullable().optional(),
  type: transactionTypeSchema,
  amount: z.int().positive(),
  date: z.iso.date(),
  isPaid: z.boolean().default(false)
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

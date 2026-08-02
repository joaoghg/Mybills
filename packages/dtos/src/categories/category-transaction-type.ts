import z from 'zod';

export const categoryTransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export type CategoryTransactionType = z.infer<typeof categoryTransactionTypeSchema>;

export const categoryTransactionTypesSchema = z
  .array(categoryTransactionTypeSchema)
  .min(1);

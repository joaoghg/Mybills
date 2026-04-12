import z from 'zod';

export const updateTransactionIsPaidInputSchema = z.object({
  isPaid: z.boolean()
});

export type UpdateTransactionIsPaidInput = z.infer<typeof updateTransactionIsPaidInputSchema>;

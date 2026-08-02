import z from 'zod';

export const transactionIdParamsSchema = z.object({
  id: z.uuid('Invalid transaction id')
});

export type TransactionIdParams = z.infer<typeof transactionIdParamsSchema>;

import z from 'zod';

export const createTransferInputSchema = z.object({
  sourceAccountId: z.uuid(),
  destinationAccountId: z.uuid(),
  amount: z.int().positive(),
  date: z.iso.date(),
  description: z.string().trim().nullable().optional()
});

export type CreateTransferInput = z.infer<typeof createTransferInputSchema>;

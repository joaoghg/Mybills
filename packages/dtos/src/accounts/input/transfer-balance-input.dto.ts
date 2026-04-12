import z from 'zod';

export const transferBalanceInputSchema = z.object({
  sourceAccountId: z.uuid(),
  destinationAccountId: z.uuid(),
  amount: z.int().positive()
});

export type TransferBalanceInput = z.infer<typeof transferBalanceInputSchema>;

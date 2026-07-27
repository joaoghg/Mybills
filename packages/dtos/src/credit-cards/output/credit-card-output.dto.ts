import z from 'zod';

export const creditCardOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  accountId: z.uuid().nullable(),
  name: z.string(),
  limit: z.int(),
  closingDay: z.int(),
  dueDay: z.int(),
  usedAmount: z.int(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreditCardOutput = z.infer<typeof creditCardOutputSchema>;
import z from 'zod';

export const createCreditCardInputSchema = z.object({
  accountId: z.uuid(),
  name: z.string().trim().min(1),
  limit: z.int(),
  closingDay: z.int(),
  dueDay: z.int()
});

export type CreateCreditCardInput = z.infer<typeof createCreditCardInputSchema>;
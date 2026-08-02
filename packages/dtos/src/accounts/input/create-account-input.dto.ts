import z from 'zod';

export const createAccountInputSchema = z.object({
  name: z.string().trim().min(1),
  balance: z.int().default(0)
});

export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

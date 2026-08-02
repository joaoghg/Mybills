import z from 'zod';

export const updateAccountInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    balance: z.int().optional()
  })
  .refine((data) => data.name !== undefined || data.balance !== undefined);

export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;

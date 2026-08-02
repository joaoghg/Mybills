import z from 'zod';

export const createCreditCardInputSchema = z
  .object({
    accountId: z.uuid().optional(),
    name: z.string().trim().min(1),
    limit: z.int(),
    closingDay: z.int().min(1).max(31).optional(),
    closingOnLastDay: z.boolean().optional().default(false),
    dueDay: z.int().min(1).max(31)
  })
  .refine((data) => data.closingOnLastDay || data.closingDay !== undefined);

export type CreateCreditCardInput = z.infer<typeof createCreditCardInputSchema>;

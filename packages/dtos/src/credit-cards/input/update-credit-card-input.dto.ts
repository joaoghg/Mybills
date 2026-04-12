import z from 'zod';

export const updateCreditCardInputSchema = z
  .object({
    accountId: z.uuid().optional(),
    name: z.string().trim().min(1).optional(),
    limit: z.int().optional(),
    closingDay: z.int().optional(),
    dueDay: z.int().optional()
  })
  .refine(
    (data) =>
      data.accountId !== undefined ||
      data.name !== undefined ||
      data.limit !== undefined ||
      data.closingDay !== undefined ||
      data.dueDay !== undefined
  );

export type UpdateCreditCardInput = z.infer<typeof updateCreditCardInputSchema>;

import z from 'zod';

export const creditCardIdParamsSchema = z.object({
  id: z.uuid('Invalid credit card id')
});

export type CreditCardIdParams = z.infer<typeof creditCardIdParamsSchema>;
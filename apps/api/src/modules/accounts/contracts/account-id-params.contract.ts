import z from 'zod';

export const accountIdParamsSchema = z.object({
  id: z.uuid('Invalid account id')
});

export type AccountIdParams = z.infer<typeof accountIdParamsSchema>;

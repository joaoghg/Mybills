import z from 'zod';

export const categoryIdParamsSchema = z.object({
  id: z.uuid('Invalid category id')
});

export type CategoryIdParams = z.infer<typeof categoryIdParamsSchema>;
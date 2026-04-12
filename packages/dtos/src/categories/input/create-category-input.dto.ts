import z from 'zod';

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1)
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

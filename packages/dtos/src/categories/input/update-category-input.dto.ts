import z from 'zod';

export const updateCategoryInputSchema = z
  .object({
    name: z.string().trim().min(1).optional()
  })
  .refine((data) => data.name !== undefined);

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

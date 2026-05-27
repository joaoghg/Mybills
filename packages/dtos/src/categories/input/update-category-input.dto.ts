import z from 'zod';

import { categoryIconSchema } from '../category-icon.js';

export const updateCategoryInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    icon: categoryIconSchema.optional()
  })
  .refine((data) => data.name !== undefined || data.icon !== undefined);

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

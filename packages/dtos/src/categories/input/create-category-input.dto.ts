import z from 'zod';

import { categoryIconSchema } from '../category-icon.js';

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1),
  icon: categoryIconSchema
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

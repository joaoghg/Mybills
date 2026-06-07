import z from 'zod';

import { categoryIconSchema } from '../category-icon.js';

export const categoryOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  icon: categoryIconSchema,
  isSystem: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CategoryOutput = z.infer<typeof categoryOutputSchema>;
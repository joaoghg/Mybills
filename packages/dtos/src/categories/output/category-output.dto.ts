import z from 'zod';

import { categoryIconSchema } from '../category-icon.js';
import { categoryTransactionTypesSchema } from '../category-transaction-type.js';

export const categoryOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  icon: categoryIconSchema,
  isSystem: z.boolean(),
  types: categoryTransactionTypesSchema,
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CategoryOutput = z.infer<typeof categoryOutputSchema>;
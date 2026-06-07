import z from 'zod';

import { categoryIconSchema } from '../category-icon.js';
import { categoryTransactionTypesSchema } from '../category-transaction-type.js';

export const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1),
  icon: categoryIconSchema,
  types: categoryTransactionTypesSchema
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

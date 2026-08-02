import z from 'zod';

import { categoryIconSchema } from '../category-icon.js';
import { categoryTransactionTypesSchema } from '../category-transaction-type.js';

export const updateCategoryInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    icon: categoryIconSchema.optional(),
    types: categoryTransactionTypesSchema.optional()
  })
  .refine((data) => data.name !== undefined || data.icon !== undefined || data.types !== undefined);

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

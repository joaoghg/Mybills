import z from 'zod';
import { categoryOutputSchema } from './category-output.dto';

export const listCategoriesOutputSchema = z.array(categoryOutputSchema);

export type ListCategoriesOutput = z.infer<typeof listCategoriesOutputSchema>;
import z from 'zod';

function booleanQueryParam(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return undefined;
}

export const listTransactionsQueryInputSchema = z
  .object({
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(1970).max(2100).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    categoryId: z.uuid().optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    includeTransfer: z.preprocess(booleanQueryParam, z.boolean().optional())
  })
  .refine(
    (data) => {
      const hasMonth = data.month !== undefined;
      const hasYear = data.year !== undefined;
      return hasMonth === hasYear;
    },
    { path: ['month'], message: 'month and year must be provided together' }
  );

export type ListTransactionsQueryInput = z.infer<typeof listTransactionsQueryInputSchema>;

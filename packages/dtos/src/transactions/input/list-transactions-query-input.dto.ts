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
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    search: z.string().trim().min(1).max(100).optional(),
    categoryId: z.uuid().optional(),
    accountId: z.uuid().optional(),
    cardId: z.uuid().optional(),
    invoiceId: z.uuid().optional(),
    type: z.enum(['INCOME', 'EXPENSE']).optional(),
    isPaid: z.preprocess(booleanQueryParam, z.boolean().optional()),
    isProjected: z.preprocess(booleanQueryParam, z.boolean().optional()),
    includeTransfer: z.preprocess(booleanQueryParam, z.boolean().optional()),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
  .refine(
    (data) => {
      const hasMonth = data.month !== undefined;
      const hasYear = data.year !== undefined;
      return hasMonth === hasYear;
    },
    { path: ['month'], message: 'month and year must be provided together' }
  )
  .refine(
    (data) => {
      const hasFrom = data.from !== undefined;
      const hasTo = data.to !== undefined;
      return hasFrom === hasTo;
    },
    { path: ['from'], message: 'from and to must be provided together' }
  )
  .refine(
    (data) => {
      const hasMonthYear = data.month !== undefined && data.year !== undefined;
      const hasFromTo = data.from !== undefined && data.to !== undefined;
      return !(hasMonthYear && hasFromTo);
    },
    { path: ['from'], message: 'from/to cannot be combined with month/year' }
  )
  .refine(
    (data) => {
      if (data.from === undefined || data.to === undefined) {
        return true;
      }
      return data.from <= data.to;
    },
    { path: ['to'], message: 'to must be on or after from' }
  );

export type ListTransactionsQueryInput = z.infer<typeof listTransactionsQueryInputSchema>;

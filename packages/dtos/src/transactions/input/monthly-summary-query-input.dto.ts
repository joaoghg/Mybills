import z from 'zod';

export const monthlySummaryQueryInputSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(1970).max(2100)
});

export type MonthlySummaryQueryInput = z.infer<typeof monthlySummaryQueryInputSchema>;

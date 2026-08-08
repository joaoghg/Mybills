import z from 'zod';
import { openInvoiceSummarySchema } from './invoice-output.dto';

export const creditCardOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  accountId: z.uuid().nullable(),
  name: z.string(),
  limit: z.int(),
  closingDay: z.int(),
  closingOnLastDay: z.boolean(),
  dueDay: z.int(),
  usedAmount: z.int(),
  openInvoice: openInvoiceSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreditCardOutput = z.infer<typeof creditCardOutputSchema>;

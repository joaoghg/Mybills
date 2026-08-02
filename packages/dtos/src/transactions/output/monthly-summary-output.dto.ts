import z from 'zod';
import { transactionOutputSchema } from './transaction-output.dto';

const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const monthlySummaryCardInvoiceSchema = z.object({
  cardId: z.uuid(),
  cardName: z.string(),
  paymentMonth: yearMonthSchema,
  total: z.int(),
  isFullyPaid: z.boolean(),
  transactions: z.array(transactionOutputSchema)
});

export const monthlySummaryOutputSchema = z.object({
  month: yearMonthSchema,
  incomeTotal: z.int(),
  expenseTotal: z.int(),
  netTotal: z.int(),
  income: z.array(transactionOutputSchema),
  expenses: z.array(transactionOutputSchema),
  cardInvoices: z.array(monthlySummaryCardInvoiceSchema)
});

export type MonthlySummaryCardInvoice = z.infer<typeof monthlySummaryCardInvoiceSchema>;
export type MonthlySummaryOutput = z.infer<typeof monthlySummaryOutputSchema>;

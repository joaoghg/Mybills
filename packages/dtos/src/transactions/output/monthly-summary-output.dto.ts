import z from 'zod';
import { cashFlowRoleSchema, financialSourceSchema } from '../../open-finance/enums';
import { yearMonthSchema } from '../../open-finance/primitives';
import { transactionOutputSchema } from './transaction-output.dto';

export const monthlySummaryCardInvoiceSchema = z.object({
  cardId: z.uuid(),
  cardName: z.string(),
  paymentMonth: yearMonthSchema,
  total: z.int(),
  isFullyPaid: z.boolean(),
  isForecast: z.boolean().default(false),
  source: financialSourceSchema.default('MANUAL'),
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

export const cashFlowClassificationOutputSchema = z.object({
  role: cashFlowRoleSchema,
  isForecast: z.boolean(),
  evidence: z.array(z.string())
});

export type MonthlySummaryCardInvoice = z.infer<typeof monthlySummaryCardInvoiceSchema>;
export type MonthlySummaryOutput = z.infer<typeof monthlySummaryOutputSchema>;
export type CashFlowClassificationOutput = z.infer<typeof cashFlowClassificationOutputSchema>;

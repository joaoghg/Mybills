import z from 'zod';
import { financialSourceSchema } from '../../open-finance/enums';
import { currencyCodeSchema } from '../../open-finance/primitives';

export const invoiceStatusSchema = z.enum(['OPEN', 'CLOSED', 'PAID']);

export const invoiceOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  creditCardId: z.uuid(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  dueOn: z.iso.date(),
  status: invoiceStatusSchema,
  amount: z.int(),
  paidAt: z.string().nullable(),
  paidAmount: z.int().nullable(),
  paymentTransactionId: z.uuid().nullable(),
  paidFromAccountId: z.uuid().nullable(),
  source: financialSourceSchema.default('MANUAL'),
  currencyCode: currencyCodeSchema.nullable().default(null),
  closingOn: z.iso.date().nullable().default(null),
  minimumPaymentAmount: z.int().nullable().default(null),
  allowsInstallments: z.boolean().nullable().default(null),
  isFullyPaid: z.boolean().nullable().default(null),
  isForecast: z.boolean().default(false),
  providerBillId: z.uuid().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type InvoiceOutput = z.infer<typeof invoiceOutputSchema>;

export const openInvoiceSummarySchema = z.object({
  id: z.uuid(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  dueOn: z.iso.date(),
  status: invoiceStatusSchema,
  amount: z.int(),
  source: financialSourceSchema.default('MANUAL'),
  isForecast: z.boolean().default(false),
  providerBillId: z.uuid().nullable().default(null)
});

export type OpenInvoiceSummary = z.infer<typeof openInvoiceSummarySchema>;

export const listInvoicesOutputSchema = z.array(invoiceOutputSchema);

export type ListInvoicesOutput = z.infer<typeof listInvoicesOutputSchema>;

export const listInvoicesQueryInputSchema = z.object({
  status: invoiceStatusSchema.optional()
});

export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQueryInputSchema>;

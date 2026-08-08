import z from 'zod';

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
  amount: z.int()
});

export type OpenInvoiceSummary = z.infer<typeof openInvoiceSummarySchema>;

export const listInvoicesOutputSchema = z.array(invoiceOutputSchema);

export type ListInvoicesOutput = z.infer<typeof listInvoicesOutputSchema>;

export const listInvoicesQueryInputSchema = z.object({
  status: invoiceStatusSchema.optional()
});

export type ListInvoicesQueryInput = z.infer<typeof listInvoicesQueryInputSchema>;

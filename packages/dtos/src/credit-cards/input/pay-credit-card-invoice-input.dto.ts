import z from 'zod';

export const payCreditCardInvoiceInputSchema = z.object({
  invoiceId: z.uuid(),
  accountId: z.uuid().optional()
});

export type PayCreditCardInvoiceInput = z.infer<typeof payCreditCardInvoiceInputSchema>;

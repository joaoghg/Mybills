import z from 'zod';

export const payCreditCardInvoiceOutputSchema = z.object({
  amount: z.int(),
  accountId: z.uuid(),
  paymentTransactionId: z.uuid(),
  paidCount: z.int(),
  invoiceId: z.uuid(),
  cycleStart: z.iso.date(),
  cycleEnd: z.iso.date()
});

export type PayCreditCardInvoiceOutput = z.infer<typeof payCreditCardInvoiceOutputSchema>;

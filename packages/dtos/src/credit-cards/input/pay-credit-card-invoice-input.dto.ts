import z from 'zod';

export const payCreditCardInvoiceInputSchema = z.object({
  cycleEnd: z.iso.date(),
  accountId: z.uuid().optional()
});

export type PayCreditCardInvoiceInput = z.infer<typeof payCreditCardInvoiceInputSchema>;

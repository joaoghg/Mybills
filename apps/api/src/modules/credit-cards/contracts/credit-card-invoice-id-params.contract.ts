import z from 'zod';
import { creditCardIdParamsSchema } from './credit-card-id-params.contract';

export const creditCardInvoiceIdParamsSchema = creditCardIdParamsSchema.extend({
  invoiceId: z.uuid()
});

export type CreditCardInvoiceIdParams = z.infer<typeof creditCardInvoiceIdParamsSchema>;

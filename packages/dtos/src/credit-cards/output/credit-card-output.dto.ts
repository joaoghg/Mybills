import z from 'zod';
import { financialSourceSchema } from '../../open-finance/enums';
import { currencyCodeSchema } from '../../open-finance/primitives';
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
  availableLimit: z.int().nullable().default(null),
  brand: z.string().nullable().default(null),
  providerStatus: z.string().nullable().default(null),
  source: financialSourceSchema.default('MANUAL'),
  currencyCode: currencyCodeSchema.nullable().default(null),
  overriddenFields: z.array(z.string()).default([]),
  hiddenAt: z.string().nullable().default(null),
  openInvoice: openInvoiceSummarySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type CreditCardOutput = z.infer<typeof creditCardOutputSchema>;

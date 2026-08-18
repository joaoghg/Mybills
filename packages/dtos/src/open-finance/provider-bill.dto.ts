import z from 'zod';
import {
  billFinanceChargeTypeSchema,
  billPaymentValueTypeSchema,
  financialSourceSchema
} from './enums';
import { currencyCodeSchema, yearMonthSchema } from './primitives';

/**
 * Provider bill payment amounts are integer cents.
 * Canonical storage keeps Decimal(19,4); API contracts expose cents.
 */
export const providerBillPaymentOutputSchema = z.object({
  id: z.uuid(),
  externalId: z.string().min(1),
  valueType: billPaymentValueTypeSchema.nullable(),
  paymentDate: z.string().nullable(),
  paymentMode: z.string().nullable(),
  amount: z.int(),
  currencyCode: currencyCodeSchema
});

export type ProviderBillPaymentOutput = z.infer<typeof providerBillPaymentOutputSchema>;

/** Provider finance-charge amounts are integer cents. */
export const providerBillFinanceChargeOutputSchema = z.object({
  id: z.uuid(),
  externalId: z.string().min(1),
  type: billFinanceChargeTypeSchema,
  amount: z.int(),
  currencyCode: currencyCodeSchema,
  additionalInfo: z.string().nullable()
});

export type ProviderBillFinanceChargeOutput = z.infer<typeof providerBillFinanceChargeOutputSchema>;

export const providerBillOutputSchema = z.object({
  id: z.uuid(),
  creditCardId: z.uuid(),
  externalId: z.string().min(1),
  source: financialSourceSchema,
  dueOn: z.iso.date(),
  closingOn: z.iso.date().nullable(),
  totalAmount: z.int(),
  minimumPaymentAmount: z.int().nullable(),
  currencyCode: currencyCodeSchema,
  allowsInstallments: z.boolean().nullable(),
  isFullyPaid: z.boolean(),
  isForecast: z.boolean(),
  forecastMonth: yearMonthSchema.nullable(),
  payments: z.array(providerBillPaymentOutputSchema),
  financeCharges: z.array(providerBillFinanceChargeOutputSchema),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type ProviderBillOutput = z.infer<typeof providerBillOutputSchema>;

export const listProviderBillsOutputSchema = z.array(providerBillOutputSchema);

export type ListProviderBillsOutput = z.infer<typeof listProviderBillsOutputSchema>;

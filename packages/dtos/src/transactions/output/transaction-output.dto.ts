import z from 'zod';
import {
  cashFlowRoleSchema,
  financialSourceSchema,
  providerTransactionStatusSchema
} from '../../open-finance/enums';
import { currencyCodeSchema, yearMonthSchema } from '../../open-finance/primitives';
import { transactionTypeSchema } from '../input/create-transaction-input.dto';

export const transactionSeriesTypeSchema = z.enum(['INSTALLMENT', 'RECURRING']);

export const transactionOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  accountId: z.uuid().nullable(),
  categoryId: z.uuid().nullable(),
  cardId: z.uuid().nullable(),
  invoiceId: z.uuid().nullable(),
  transferGroupId: z.uuid().nullable(),
  seriesId: z.uuid().nullable(),
  occurrenceNumber: z.int().positive().nullable(),
  seriesType: transactionSeriesTypeSchema.nullable(),
  seriesTotalOccurrences: z.int().positive().nullable(),
  description: z.string().nullable(),
  type: transactionTypeSchema,
  amount: z.int(),
  date: z.string(),
  competenceDate: z.string().nullable(),
  isPaid: z.boolean(),
  isProjected: z.boolean(),
  invoicePaymentMonth: yearMonthSchema.nullable(),
  source: financialSourceSchema.default('MANUAL'),
  currencyCode: currencyCodeSchema.nullable().default(null),
  providerStatus: providerTransactionStatusSchema.nullable().default(null),
  providerCategoryId: z.string().nullable().default(null),
  providerCategoryName: z.string().nullable().default(null),
  overriddenFields: z.array(z.string()).default([]),
  hiddenAt: z.string().nullable().default(null),
  providerBillId: z.uuid().nullable().default(null),
  billForecastMonth: yearMonthSchema.nullable().default(null),
  cashFlowRole: cashFlowRoleSchema.default('NORMAL'),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type TransactionOutput = z.infer<typeof transactionOutputSchema>;

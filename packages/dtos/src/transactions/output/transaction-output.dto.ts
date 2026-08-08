import z from 'zod';
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
  isPaid: z.boolean(),
  isProjected: z.boolean(),
  invoicePaymentMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type TransactionOutput = z.infer<typeof transactionOutputSchema>;

import z from 'zod';
import {
  transactionScheduleSchema,
  transactionTypeSchema
} from './create-transaction-input.dto';

export const transactionSeriesScopeSchema = z.enum(['SINGLE', 'THIS_AND_FUTURE']);

export const updateTransactionInputSchema = z
  .object({
    accountId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    cardId: z.uuid().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    type: transactionTypeSchema.optional(),
    amount: z.int().positive().optional(),
    date: z.iso.date().optional(),
    competenceDate: z.iso.date().nullable().optional(),
    scope: transactionSeriesScopeSchema.optional().default('SINGLE'),
    schedule: transactionScheduleSchema.optional()
  })
  .superRefine((data, ctx) => {
    const hasField =
      data.accountId !== undefined ||
      data.categoryId !== undefined ||
      data.cardId !== undefined ||
      data.description !== undefined ||
      data.type !== undefined ||
      data.amount !== undefined ||
      data.date !== undefined ||
      data.competenceDate !== undefined ||
      data.schedule !== undefined;

    if (!hasField) {
      ctx.addIssue({
        code: 'custom',
        message: 'at least one field is required'
      });
    }

    if (data.schedule?.mode !== undefined && data.schedule.mode !== 'NONE' && data.type === 'TRANSFER') {
      ctx.addIssue({
        code: 'custom',
        path: ['schedule'],
        message: 'schedule not allowed for TRANSFER'
      });
    }

    if (data.competenceDate && data.type !== undefined && data.type !== 'INCOME') {
      ctx.addIssue({
        code: 'custom',
        path: ['competenceDate'],
        message: 'competenceDate is only allowed for INCOME'
      });
    }

    if (data.competenceDate && data.schedule !== undefined && data.schedule.mode !== 'NONE') {
      ctx.addIssue({
        code: 'custom',
        path: ['competenceDate'],
        message: 'competenceDate is not allowed for scheduled transactions'
      });
    }

    if (data.competenceDate && data.scope === 'THIS_AND_FUTURE') {
      ctx.addIssue({
        code: 'custom',
        path: ['competenceDate'],
        message: 'competenceDate is only allowed for SINGLE scope'
      });
    }
  });

export type TransactionSeriesScope = z.infer<typeof transactionSeriesScopeSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

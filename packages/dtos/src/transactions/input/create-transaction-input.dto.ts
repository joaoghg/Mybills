import z from 'zod';

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE', 'TRANSFER']);

export const transactionScheduleModeSchema = z.enum(['NONE', 'INSTALLMENT', 'RECURRING']);

export const transactionScheduleNoneSchema = z.object({
  mode: z.literal('NONE')
});

export const transactionScheduleInstallmentSchema = z.object({
  mode: z.literal('INSTALLMENT'),
  endDate: z.iso.date()
});

export const transactionScheduleRecurringSchema = z.object({
  mode: z.literal('RECURRING')
});

export const transactionScheduleSchema = z.discriminatedUnion('mode', [
  transactionScheduleNoneSchema,
  transactionScheduleInstallmentSchema,
  transactionScheduleRecurringSchema
]);

export const createTransactionInputSchema = z
  .object({
    accountId: z.uuid().nullable().optional(),
    categoryId: z.uuid().nullable().optional(),
    cardId: z.uuid().nullable().optional(),
    description: z.string().trim().nullable().optional(),
    type: transactionTypeSchema,
    amount: z.int().positive(),
    date: z.iso.date(),
    isPaid: z.boolean().default(false),
    schedule: transactionScheduleSchema.optional().default({ mode: 'NONE' })
  })
  .superRefine((data, ctx) => {
    if (data.schedule.mode === 'INSTALLMENT' && data.schedule.endDate <= data.date) {
      ctx.addIssue({
        code: 'custom',
        path: ['schedule', 'endDate'],
        message: 'endDate must be after date'
      });
    }

    if (data.schedule.mode !== 'NONE' && data.type === 'TRANSFER') {
      ctx.addIssue({
        code: 'custom',
        path: ['schedule'],
        message: 'schedule not allowed for TRANSFER'
      });
    }
  });

export type TransactionScheduleMode = z.infer<typeof transactionScheduleModeSchema>;
export type TransactionSchedule = z.infer<typeof transactionScheduleSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

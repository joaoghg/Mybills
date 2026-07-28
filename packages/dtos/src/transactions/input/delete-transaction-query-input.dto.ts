import z from 'zod';
import { transactionSeriesScopeSchema } from './update-transaction-input.dto';

export const deleteTransactionQueryInputSchema = z.object({
  scope: transactionSeriesScopeSchema.optional().default('SINGLE')
});

export type DeleteTransactionQueryInput = z.infer<typeof deleteTransactionQueryInputSchema>;

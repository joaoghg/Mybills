import z from 'zod';
import { transactionOutputSchema } from './transaction-output.dto';

export const listTransactionsOutputSchema = z.array(transactionOutputSchema);

export type ListTransactionsOutput = z.infer<typeof listTransactionsOutputSchema>;

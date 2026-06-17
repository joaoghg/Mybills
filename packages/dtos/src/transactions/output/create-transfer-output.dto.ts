import z from 'zod';

import { transactionOutputSchema } from './transaction-output.dto';

export const createTransferOutputSchema = z.object({
  transferGroupId: z.uuid(),
  sourceTransaction: transactionOutputSchema,
  destinationTransaction: transactionOutputSchema
});

export type CreateTransferOutput = z.infer<typeof createTransferOutputSchema>;

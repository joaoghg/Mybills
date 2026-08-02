import z from 'zod';
import { accountOutputSchema } from './account-output.dto';

export const listAccountsOutputSchema = z.array(accountOutputSchema);

export type ListAccountsOutput = z.infer<typeof listAccountsOutputSchema>;

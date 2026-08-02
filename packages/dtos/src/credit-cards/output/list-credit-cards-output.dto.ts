import z from 'zod';
import { creditCardOutputSchema } from './credit-card-output.dto';

export const listCreditCardsOutputSchema = z.array(creditCardOutputSchema);

export type ListCreditCardsOutput = z.infer<typeof listCreditCardsOutputSchema>;
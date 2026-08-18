import z from 'zod';
import { financialSourceSchema } from '../../open-finance/enums';
import { currencyCodeSchema } from '../../open-finance/primitives';

export const accountOutputSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  balance: z.int(),
  userId: z.uuid(),
  source: financialSourceSchema.default('MANUAL'),
  currencyCode: currencyCodeSchema.nullable().default(null),
  overriddenFields: z.array(z.string()).default([]),
  hiddenAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type AccountOutput = z.infer<typeof accountOutputSchema>;

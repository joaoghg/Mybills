import z from 'zod';
import { financialSourceSchema } from './enums';

export const projectionOverrideMetadataSchema = z.object({
  source: financialSourceSchema,
  overriddenFields: z.array(z.string()),
  hiddenAt: z.string().nullable()
});

export type ProjectionOverrideMetadata = z.infer<typeof projectionOverrideMetadataSchema>;

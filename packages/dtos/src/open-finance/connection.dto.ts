import z from 'zod';
import {
  openFinanceConnectionStatusSchema,
  openFinanceItemStatusSchema,
  openFinanceProductStatusSchema,
  openFinanceProductTypeSchema,
  openFinanceSyncRunStatusSchema,
  openFinanceSyncTriggerSchema,
  sanitizedPluggyErrorSchema
} from './enums';

export const createOpenFinanceConnectionInputSchema = z.object({
  itemId: z.uuid()
});

export type CreateOpenFinanceConnectionInput = z.infer<typeof createOpenFinanceConnectionInputSchema>;

export const openFinanceProductStateOutputSchema = z.object({
  product: openFinanceProductTypeSchema,
  status: openFinanceProductStatusSchema,
  lastSuccessfulSyncAt: z.string().nullable(),
  error: sanitizedPluggyErrorSchema.nullable()
});

export type OpenFinanceProductStateOutput = z.infer<typeof openFinanceProductStateOutputSchema>;

export const openFinanceConnectionOutputSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  itemId: z.uuid(),
  connectorId: z.int(),
  status: openFinanceConnectionStatusSchema,
  itemStatus: openFinanceItemStatusSchema.nullable(),
  institutionName: z.string().nullable(),
  institutionLogoUrl: z.string().nullable(),
  products: z.array(openFinanceProductStateOutputSchema),
  lastSuccessfulSyncAt: z.string().nullable(),
  lastSyncAttemptAt: z.string().nullable(),
  error: sanitizedPluggyErrorSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OpenFinanceConnectionOutput = z.infer<typeof openFinanceConnectionOutputSchema>;

export const listOpenFinanceConnectionsOutputSchema = z.array(openFinanceConnectionOutputSchema);

export type ListOpenFinanceConnectionsOutput = z.infer<typeof listOpenFinanceConnectionsOutputSchema>;

export const openFinanceConnectionIdParamsSchema = z.object({
  connectionId: z.uuid()
});

export type OpenFinanceConnectionIdParams = z.infer<typeof openFinanceConnectionIdParamsSchema>;

export const openFinanceSyncRunIdParamsSchema = z.object({
  connectionId: z.uuid(),
  syncRunId: z.uuid()
});

export type OpenFinanceSyncRunIdParams = z.infer<typeof openFinanceSyncRunIdParamsSchema>;

export const openFinanceSyncRunOutputSchema = z.object({
  id: z.uuid(),
  connectionId: z.uuid(),
  trigger: openFinanceSyncTriggerSchema,
  status: openFinanceSyncRunStatusSchema,
  products: z.array(openFinanceProductStateOutputSchema),
  error: sanitizedPluggyErrorSchema.nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type OpenFinanceSyncRunOutput = z.infer<typeof openFinanceSyncRunOutputSchema>;

export const resetOpenFinanceOverridesInputSchema = z.object({
  fields: z.array(z.string().min(1)).min(1)
});

export type ResetOpenFinanceOverridesInput = z.infer<typeof resetOpenFinanceOverridesInputSchema>;

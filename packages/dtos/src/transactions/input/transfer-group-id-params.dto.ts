import z from 'zod';

export const transferGroupIdParamsSchema = z.object({
  transferGroupId: z.uuid('Invalid transfer group id')
});

export type TransferGroupIdParams = z.infer<typeof transferGroupIdParamsSchema>;

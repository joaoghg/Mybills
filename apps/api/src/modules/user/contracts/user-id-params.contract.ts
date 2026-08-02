import z from 'zod';

export const userIdParamsSchema = z.object({
  id: z.uuid('Invalid user id')
});

export type UserIdParams = z.infer<typeof userIdParamsSchema>;

import z from 'zod';

export const updateUserInputSchema = z
  .object({
    name: z.string('Invalid name').trim().min(1, 'Name is required').optional(),
    email: z.email('Invalid email').optional()
  })
  .refine((data) => data.name !== undefined || data.email !== undefined);

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

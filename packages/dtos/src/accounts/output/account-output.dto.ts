import z from 'zod';

export const accountOutputSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  balance: z.int(),
  userId: z.uuid(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type AccountOutput = z.infer<typeof accountOutputSchema>;

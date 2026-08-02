import z from 'zod';

export const userOutputSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type UserOutput = z.infer<typeof userOutputSchema>;
import z from 'zod';

export const signUpInputSchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  password: z
    .string()
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

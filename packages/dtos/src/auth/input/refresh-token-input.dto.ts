import z from 'zod';

export const refreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1)
});

export type RefreshTokenInput = z.infer<typeof refreshTokenInputSchema>;
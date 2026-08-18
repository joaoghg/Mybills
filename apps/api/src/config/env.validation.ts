import z from 'zod';

export const envSchema = z
  .object({
    PORT: z.string().default('3000'),
    DATABASE_URL: z.url(),
    ACCESS_TOKEN_SECRET: z.string().min(10, 'Access token key must contain at least 10 characters'),
    REFRESH_TOKEN_SECRET: z.string().min(10, 'Refresh token key must contain at least 10 characters'),
    OPEN_FINANCE_ENABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    PLUGGY_CLIENT_ID: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional()
    ),
    PLUGGY_CLIENT_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional()
    ),
    PLUGGY_WEBHOOK_SECRET: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(16).optional()
    ),
    PLUGGY_SYNC_STALE_HOURS: z.coerce.number().int().min(1).max(168).default(24)
  })
  .superRefine((data, ctx) => {
    if (!data.OPEN_FINANCE_ENABLED) {
      return;
    }

    if (!data.PLUGGY_CLIENT_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['PLUGGY_CLIENT_ID'],
        message: 'PLUGGY_CLIENT_ID is required when OPEN_FINANCE_ENABLED is true'
      });
    }

    if (!data.PLUGGY_CLIENT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['PLUGGY_CLIENT_SECRET'],
        message: 'PLUGGY_CLIENT_SECRET is required when OPEN_FINANCE_ENABLED is true'
      });
    }

    if (!data.PLUGGY_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['PLUGGY_WEBHOOK_SECRET'],
        message: 'PLUGGY_WEBHOOK_SECRET is required when OPEN_FINANCE_ENABLED is true'
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}

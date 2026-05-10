import type { RefreshTokenInput, RefreshTokenOutput } from '@mybills/dtos/auth';
import { refreshTokenOutputSchema } from '@mybills/dtos/auth';

import type { HttpClient } from '../http-client.js';

export async function refresh(
  client: HttpClient,
  input: RefreshTokenInput
): Promise<RefreshTokenOutput> {
  const raw = await client.postJson<unknown>('/auth/refresh', input);
  return refreshTokenOutputSchema.parse(raw);
}

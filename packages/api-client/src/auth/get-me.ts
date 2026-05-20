import type { UserOutput } from '@mybills/dtos';
import { userOutputSchema } from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function getMe(client: HttpClient): Promise<UserOutput> {
  const raw = await client.getJson<unknown>('/auth/me');
  return userOutputSchema.parse(raw);
}

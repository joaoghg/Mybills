import type { SignInInput, SignInOutput } from '@mybills/dtos/auth';
import { signInOutputSchema } from '@mybills/dtos/auth';

import type { HttpClient } from '../http-client.js';

export async function login(
  client: HttpClient,
  input: SignInInput
): Promise<SignInOutput> {
  const raw = await client.postJson<unknown>('/auth/login', input);
  return signInOutputSchema.parse(raw);
}

import type { SignUpInput, SignUpOutput } from '@mybills/dtos/auth';
import { signUpOutputSchema } from '@mybills/dtos/auth';

import type { HttpClient } from '../http-client.js';

export async function register(
  client: HttpClient,
  input: SignUpInput
): Promise<SignUpOutput> {
  const raw = await client.postJson<unknown>('/auth/register', input);
  return signUpOutputSchema.parse(raw);
}

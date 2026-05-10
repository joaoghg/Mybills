import { register } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { SignUpInput, SignUpOutput } from '@mybills/dtos/auth';

export function registerUser(
  client: HttpClient,
  input: SignUpInput
): Promise<SignUpOutput> {
  return register(client, input);
}

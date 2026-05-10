import { login, register } from '@mybills/api-client';
import type { HttpClient } from '@mybills/api-client';
import type { SignInInput, SignInOutput, SignUpInput, SignUpOutput } from '@mybills/dtos/auth';

export function registerUser(
  client: HttpClient,
  input: SignUpInput
): Promise<SignUpOutput> {
  return register(client, input);
}

export function loginUser(
  client: HttpClient,
  input: SignInInput
): Promise<SignInOutput> {
  return login(client, input);
}

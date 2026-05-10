import { useMutation } from '@tanstack/react-query';
import type { SignUpInput } from '@mybills/dtos/auth';

import { getHttpClient } from '../../../core/api/http-client';
import { registerUser } from '../services/auth.service';

export function useSignUp() {
  return useMutation({
    mutationFn: (input: SignUpInput) => registerUser(getHttpClient(), input)
  });
}

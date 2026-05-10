import { useMutation } from '@tanstack/react-query';
import type { SignInInput } from '@mybills/dtos/auth';

import { getHttpClient } from '../../../core/api/http-client';
import { loginUser } from '../services/auth.service';
import { saveSessionTokens } from '../storage/session-tokens';

export function useSignIn() {
  return useMutation({
    mutationFn: (input: SignInInput) => loginUser(getHttpClient(), input),
    onSuccess: (data) => {
      void saveSessionTokens(data);
    }
  });
}

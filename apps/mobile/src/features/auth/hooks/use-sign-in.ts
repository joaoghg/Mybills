import { useMutation } from '@tanstack/react-query';
import type { SignInInput } from '@mybills/dtos/auth';

import { useHttpClient } from '@/core/api/http-client-provider';
import { saveSessionTokens } from '@/core/session/session-tokens';
import { loginUser } from '@/features/auth/services/auth.service';

export function useSignIn() {
  const client = useHttpClient();

  return useMutation({
    mutationFn: (input: SignInInput) => loginUser(client, input),
    onSuccess: (data) => {
      void saveSessionTokens(data);
    }
  });
}

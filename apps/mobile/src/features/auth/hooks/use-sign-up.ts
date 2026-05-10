import { useMutation } from '@tanstack/react-query';
import type { SignUpInput } from '@mybills/dtos/auth';

import { useHttpClient } from '../../../core/api/http-client-provider';
import { saveSessionTokens } from '../../../core/session/session-tokens';
import { registerUser } from '../services/auth.service';

export function useSignUp() {
  const client = useHttpClient();

  return useMutation({
    mutationFn: (input: SignUpInput) => registerUser(client, input),
    onSuccess: (data) => {
      void saveSessionTokens(data);
    }
  });
}

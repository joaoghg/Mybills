import { createHttpClient, type HttpClient } from '@mybills/api-client';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo
} from 'react';

import { getApiBaseUrl } from '@/core/config/env';
import { useAuthSession } from '@/core/session/auth-session-provider';
import {
  clearSessionTokens,
  getAccessToken,
  getRefreshToken,
  saveSessionTokens
} from '@/core/session/session-tokens';

const HttpClientContext = createContext<HttpClient | null>(null);

type HttpClientProviderProps = {
  children: ReactNode;
};

export function HttpClientProvider({ children }: HttpClientProviderProps) {
  const queryClient = useQueryClient();
  const { markSignedOut } = useAuthSession();

  const client = useMemo(
    () =>
      createHttpClient({
        baseUrl: getApiBaseUrl(),
        auth: {
          getAccessToken,
          getRefreshToken,
          persistTokens: saveSessionTokens,
          onSessionInvalid: async () => {
            await clearSessionTokens();
            markSignedOut();
            queryClient.clear();
          }
        }
      }),
    [markSignedOut, queryClient]
  );

  return (
    <HttpClientContext.Provider value={client}>{children}</HttpClientContext.Provider>
  );
}

export function useHttpClient(): HttpClient {
  const client = useContext(HttpClientContext);
  if (!client) {
    throw new Error('useHttpClient must be used within HttpClientProvider');
  }
  return client;
}

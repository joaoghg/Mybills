import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { getRefreshToken } from './session-tokens';

export type AuthSessionStatus = 'loading' | 'guest' | 'user';

type AuthSessionValue = {
  status: AuthSessionStatus;
  markSignedIn: () => void;
  markSignedOut: () => void;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

type AuthSessionProviderProps = {
  children: ReactNode;
};

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  const [status, setStatus] = useState<AuthSessionStatus>('loading');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const refresh = await getRefreshToken();
      if (cancelled) {
        return;
      }
      setStatus(refresh ? 'user' : 'guest');
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const markSignedIn = useCallback(() => {
    setStatus('user');
  }, []);

  const markSignedOut = useCallback(() => {
    setStatus('guest');
  }, []);

  const value = useMemo(
    (): AuthSessionValue => ({
      status,
      markSignedIn,
      markSignedOut
    }),
    [status, markSignedIn, markSignedOut]
  );

  return (
    <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>
  );
}

export function useAuthSession(): AuthSessionValue {
  const ctx = useContext(AuthSessionContext);
  if (!ctx) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }
  return ctx;
}

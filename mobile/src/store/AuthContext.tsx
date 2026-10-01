import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authApi from '@/api/auth';
import { getToken, setToken, clearToken } from '@/api/tokenStore';
import type { AuthUser } from '@/api/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On boot: if we have a stored token, validate it via /auth/profile.
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const profile = await authApi.getProfile();
          setUser(profile);
        }
      } catch {
        await clearToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setToken(res.sessionToken);
    setUser(res.user);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await authApi.register({ name, email, password });
      // Registration may require email verification before login succeeds;
      // attempt an immediate sign-in and let the caller surface any error.
      const res = await authApi.login(email, password);
      await setToken(res.sessionToken);
      setUser(res.user);
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore server errors on logout — always clear locally.
    }
    await clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

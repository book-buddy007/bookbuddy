import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface TenantMembership {
  tenantId: string;
  tenantName: string;
  tenantType: string;
  role: string;
  status: string;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  accountType: 'INDEPENDENT' | 'institutional';
  subscriptionTier: string | null;
  subscriptionStatus: string | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  tenantMemberships: TenantMembership[];
  avatar?: string;
}

interface TenantState {
  currentTenantId: string | null;
  switchTenant: (tenantId: string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      currentTenantId: null,
      switchTenant: (tenantId) => set({ currentTenantId: tenantId }),
    }),
    { name: 'tenant-storage' }
  )
);

interface AuthSyncState {
  user: User | null;
  currentTenantId: string | null;
  setAuth: (user: User | null, currentTenantId: string | null) => void;
}

export const useAuthSyncStore = create<AuthSyncState>((set) => ({
  user: null,
  currentTenantId: null,
  setAuth: (user, currentTenantId) => set({ user, currentTenantId })
}));

export function useAuthStore() {
  const { data: session, isPending: isLoading, error } = authClient.useSession();
  const { currentTenantId, switchTenant } = useTenantStore();
  const [internalError, setInternalError] = useState<string | null>(null);

  const user = session?.user ? (session.user as unknown as User) : null;
  const isAuthenticated = !!session;

  const activeTenantId = currentTenantId || user?.tenantMemberships?.[0]?.tenantId || null;

  // Sync React hook state to the synchronous Zustand store so outside functions (like useAnnotationStore) can read it
  // We use useState combined with useEffect to ensure this runs gracefully
  const { setAuth } = useAuthSyncStore.getState();
  if (useAuthSyncStore.getState().user !== user || useAuthSyncStore.getState().currentTenantId !== activeTenantId) {
    setAuth(user, activeTenantId);
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    error: error?.message || internalError || null,
    currentTenantId: activeTenantId,

    login: async (email: string, password: string) => {
      setInternalError(null);
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        const msg = res.error.message || 'Login failed';
        setInternalError(msg);
        throw new Error(msg);
      }
      return res.data;
    },
    logout: async () => {
      await authClient.signOut();
    },
    register: async (name: string, email: string, password: string, role = 'student', subscriptionTier = 'trial') => {
      setInternalError(null);
      const res = await authClient.signUp.email({ email, password, name });
      if (res.error) {
        setInternalError(res.error.message || 'Registration failed');
        throw new Error(res.error.message || 'Registration failed');
      }
      return res.data;
    },
    refreshAuth: async () => {},
    switchTenant,
    checkAuth: async () => {},
    clearError: () => setInternalError(null),
  };
}
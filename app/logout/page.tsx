'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { BrandMark } from '@/components/ui/brand-mark';
import { Icon } from '@/components/ui/icon';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuthStore();

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        // Go to login anyway
        router.push('/login');
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-bb-bg px-4">
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <BrandMark height={30} />
        <Icon name="loader" size={28} fillLayer={false} className="animate-spin text-bb-accent" />
        <div>
          <h1 className="font-display text-xl font-bold text-bb-text">Signing you out…</h1>
          <p className="mt-1 text-sm text-bb-muted">See you next time.</p>
        </div>
      </div>
    </main>
  );
}

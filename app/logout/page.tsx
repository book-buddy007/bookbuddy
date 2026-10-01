'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuthStore();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call the logout function from the auth store
        await logout();
        
        // Redirect to login page after successful logout
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        // Redirect to login anyway
        router.push('/login');
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Logging out...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Please wait while we sign you out.
        </p>
      </div>
    </div>
  );
}


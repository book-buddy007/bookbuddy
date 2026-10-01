import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/useAuthStore";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  pendingEmail?: string | null;
  pendingPhone?: string | null;
  role: string;
  accountType?: string;
  memberships?: any[];
  joinRequests?: Array<{
    id: string;
    status: string;
    tenant: { name: string };
  }>;
  onboardingCompleted?: boolean;
  onboardingStep?: number;
  studentId?: string;
  profileImage?: string;
  createdAt: string;
  preferences?: {
    notifications: string;
    theme: string;
    fontSize: string;
    contrast: string;
  };
}

export function useUserProfile() {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery<UserProfile, Error>({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load profile data');
      }
      const profileData = await response.json();
      return {
        id: profileData.id || user?.id,
        name: profileData.name || user?.name || 'Student User',
        email: profileData.email || user?.email || '',
        phone: profileData.phone || '',
        emailVerified: !!profileData.emailVerified,
        phoneVerified: !!profileData.phoneVerified,
        pendingEmail: profileData.pendingEmail,
        pendingPhone: profileData.pendingPhone,
        role: profileData.role || user?.role || 'student',
        accountType: profileData.accountType,
        memberships: profileData.tenantMemberships || profileData.memberships || [],
        joinRequests: profileData.joinRequests || [],
        onboardingCompleted: profileData.onboardingCompleted,
        onboardingStep: profileData.onboardingStep,
        studentId: profileData.studentId || 'STU' + (user?.id?.slice(-5).toUpperCase() || ''),
        profileImage: profileData.profileImage || user?.avatar,
        createdAt: profileData.createdAt || new Date().toISOString(),
        preferences: profileData.preferences || {
          notifications: 'all',
          theme: 'system',
          fontSize: 'normal',
          contrast: 'normal'
        }
      };
    },
    enabled: !!user?.id && isAuthenticated && !isAuthLoading,
    staleTime: 5000,
  });

  return {
    userProfile: data || null,
    loading: isLoading || isAuthLoading,
    error: error?.message || null,
    refetch,
  };
}

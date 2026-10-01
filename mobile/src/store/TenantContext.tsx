import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useThemeColors } from '@/ThemeProvider';
import { colors as defaultColors } from '@/theme';

export interface TenantBranding {
  tenantId: string | null;
  tenantName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  isInstitutional: boolean;
}

const DEFAULT_BRANDING: TenantBranding = {
  tenantId: null,
  tenantName: 'Book Buddy by VPD',
  logoUrl: null,
  primaryColor: defaultColors.primary,
  accentColor: defaultColors.gold,
  isInstitutional: false,
};

interface TenantContextValue {
  branding: TenantBranding;
  activeColors: typeof defaultColors;
}

const TenantContext = createContext<TenantContextValue>({
  branding: DEFAULT_BRANDING,
  activeColors: defaultColors,
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // Tenant branding overlays whichever theme is active, so the institution's
  // colors survive a light/dark toggle instead of pinning the app to light.
  const themeColors = useThemeColors();
  const [branding, setBranding] = useState<TenantBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    if (user?.tenantMemberships && user.tenantMemberships.length > 0) {
      const activeMembership = user.tenantMemberships[0];
      setBranding({
        tenantId: activeMembership.tenantId,
        tenantName: activeMembership.tenantName || 'Institutional Library',
        logoUrl: null,
        primaryColor: defaultColors.primary,
        accentColor: defaultColors.gold,
        isInstitutional: true,
      });
    } else {
      setBranding(DEFAULT_BRANDING);
    }
  }, [user]);

  const activeColors = {
    ...themeColors,
    primary: branding.primaryColor,
    gold: branding.accentColor,
  };

  return (
    <TenantContext.Provider value={{ branding, activeColors }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

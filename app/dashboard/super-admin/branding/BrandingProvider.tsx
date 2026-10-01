'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getInstitutions, getBranding } from '@/lib/api/adminApi';
import { Institution, BrandingConfig } from '@/types/admin';

interface BrandingContextValue {
  institutions: Institution[];
  selectedTenantId: string;
  setSelectedTenantId: (id: string) => void;
  currentBranding: BrandingConfig | null;
  setCurrentBranding: (b: BrandingConfig) => void;
  refreshBranding: () => Promise<void>;
  isLoadingTenants: boolean;
  isLoadingBranding: boolean;
}

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [currentBranding, setCurrentBranding] = useState<BrandingConfig | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(true);
  const [isLoadingBranding, setIsLoadingBranding] = useState(false);

  // Fetch institutions on mount
  useEffect(() => {
    const fetchInstitutions = async () => {
      setIsLoadingTenants(true);
      const res = await getInstitutions();
      if (res.success && res.data) {
        setInstitutions(res.data);
        if (res.data.length > 0) {
          setSelectedTenantId(res.data[0].id);
        }
      }
      setIsLoadingTenants(false);
    };
    fetchInstitutions();
  }, []);

  // Fetch branding when tenant changes
  const refreshBranding = useCallback(async () => {
    if (!selectedTenantId) return;
    setIsLoadingBranding(true);
    const res = await getBranding(selectedTenantId);
    if (res.success && res.data) {
      setCurrentBranding(res.data);
    } else {
      setCurrentBranding(null);
    }
    setIsLoadingBranding(false);
  }, [selectedTenantId]);

  useEffect(() => {
    refreshBranding();
  }, [refreshBranding]);

  return (
    <BrandingContext.Provider value={{
      institutions,
      selectedTenantId,
      setSelectedTenantId,
      currentBranding,
      setCurrentBranding,
      refreshBranding,
      isLoadingTenants,
      isLoadingBranding,
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBrandingTenant() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBrandingTenant must be used within BrandingProvider');
  return ctx;
}

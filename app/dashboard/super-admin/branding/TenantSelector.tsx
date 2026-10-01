'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Loader2 } from '@/components/ui/icons';
import { useBrandingTenant } from './BrandingProvider';

export function TenantSelector() {
  const { institutions, selectedTenantId, setSelectedTenantId, isLoadingTenants } = useBrandingTenant();

  if (isLoadingTenants) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading institutions…
      </div>
    );
  }

  if (institutions.length === 0) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400 py-2">
        No institutions found. Create one first.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-[var(--peacock-teal)]/10 dark:bg-[var(--peacock-teal)]/20">
        <Building2 className="h-4 w-4 text-[var(--peacock-teal)]" />
      </div>
      <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
        <SelectTrigger className="w-[280px] border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-md focus:ring-[var(--peacock-teal)] text-slate-700 dark:text-slate-300 rounded-xl">
          <SelectValue placeholder="Select institution…" />
        </SelectTrigger>
        <SelectContent>
          {institutions.map(inst => (
            <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

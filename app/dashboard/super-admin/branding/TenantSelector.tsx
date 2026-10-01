'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Icon } from '@/components/ui/icon';
import { useBrandingTenant } from './BrandingProvider';

export function TenantSelector() {
  const { institutions, selectedTenantId, setSelectedTenantId, isLoadingTenants } = useBrandingTenant();

  if (isLoadingTenants) {
    return (
      <div role="status" className="flex items-center gap-2 py-2 text-sm text-bb-muted">
        <Icon name="loader" size={16} className="animate-spin" />
        Loading institutions…
      </div>
    );
  }

  if (institutions.length === 0) {
    return <p className="py-2 text-sm text-bb-muted">No institutions found. Create one first.</p>;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-bb-accent-soft">
        <Icon name="institution" size={18} />
      </span>
      <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
        <SelectTrigger className="w-[280px]" aria-label="Institution">
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

import { apiFetch } from './client';
import type { Institution, InstitutionDetail } from './types';

export interface BrowseFilters {
  type?: string;
  location?: string;
  search?: string;
}

/**
 * GET /institutions/browse — public directory.
 *
 * Only institutions that are active *and* have `allowJoinRequests` enabled are
 * returned, so everything listed here can actually be applied to.
 */
export function browseInstitutions(filters: BrowseFilters = {}) {
  const query = new URLSearchParams();
  if (filters.type) query.set('type', filters.type);
  if (filters.location) query.set('location', filters.location);
  if (filters.search) query.set('search', filters.search);

  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch<Institution[]>(`/institutions/browse${suffix}`, { auth: false });
}

export function getInstitutionTypes() {
  return apiFetch<string[]>('/institutions/types', { auth: false });
}

export function getInstitutionLocations() {
  return apiFetch<string[]>('/institutions/locations', { auth: false });
}

export function getInstitution(id: string) {
  return apiFetch<InstitutionDetail>(`/institutions/${id}`, { auth: false });
}

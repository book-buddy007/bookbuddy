import axios from 'axios';
import {
  Institution,
  Subscription,
  UserAdmin,
  AuditLog,
  BrandingConfig,
  AdminApiResponse
} from '../../types/admin';
import type { BookUpdatePayload } from '../../types/book-update.types';

// Helper: Convert any error value to a clean string
function extractErrorMessage(data: any): string {
  if (!data) return 'An unknown error occurred';
  // Top-level message (NestJS HttpException)
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join(', ');
  // Nested error object (custom backend format)
  if (data.error) {
    if (typeof data.error === 'string') return data.error;
    if (typeof data.error === 'object') {
      return data.error.message || data.error.details || data.error.code || JSON.stringify(data.error);
    }
  }
  // Book Buddy backend success:false format
  if (data.success === false && data.error) {
    if (typeof data.error === 'string') return data.error;
    if (typeof data.error === 'object') {
      return data.error.message || data.error.details || data.error.code || JSON.stringify(data.error);
    }
  }
  if (typeof data === 'string') return data;
  return 'An unknown error occurred';
}

// Create axios instance with auth header
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Normalize ALL complex error objects into the standard error.message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Mutate the Error object message, not the response payload!
    const msg = extractErrorMessage(error.response?.data);
    if (msg) {
      error.message = msg;
    }
    return Promise.reject(error);
  }
);

// Institution APIs
export const getInstitutions = async (): Promise<AdminApiResponse<Institution[]>> => {
  try {
    const response = await apiClient.get('/admin/institutions');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const getInstitution = async (id: string): Promise<AdminApiResponse<Institution>> => {
  try {
    const response = await apiClient.get(`/admin/institutions/${id}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

/** Creating an institution also provisions its first admin, so the payload carries the admin's identity. */
export type CreateInstitutionInput = Partial<Institution> & { adminEmail?: string; adminName?: string };

export const createInstitution = async (institution: CreateInstitutionInput): Promise<AdminApiResponse<Institution>> => {
  try {
    const response = await apiClient.post('/admin/institutions', institution);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const updateInstitution = async (id: string, institution: Partial<Institution>): Promise<AdminApiResponse<Institution>> => {
  try {
    const response = await apiClient.put(`/admin/institutions/${id}`, institution);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const deleteInstitution = async (id: string): Promise<AdminApiResponse<void>> => {
  try {
    await apiClient.delete(`/admin/institutions/${id}`);
    return { success: true };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

// Subscription APIs
export const getSubscriptions = async (): Promise<AdminApiResponse<Subscription[]>> => {
  try {
    const response = await apiClient.get('/admin/subscriptions');
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const createSubscription = async (subscription: Partial<Subscription>): Promise<AdminApiResponse<Subscription>> => {
  try {
    const response = await apiClient.post('/admin/subscriptions', subscription);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

// User APIs
export const getUserStats = async (tenantId?: string) => {
  try {
    const url = tenantId ? `/admin/users/stats?tenantId=${tenantId}` : '/admin/users/stats';
    const response = await apiClient.get(url);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const getUsers = async (params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  tenantId?: string;
} = {}): Promise<AdminApiResponse<any>> => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.role) queryParams.append('role', params.role);
    if (params.status) queryParams.append('status', params.status);
    if (params.tenantId) queryParams.append('tenantId', params.tenantId);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/admin/users?${queryString}` : '/admin/users';
    
    const response = await apiClient.get(url);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const createUser = async (user: Partial<UserAdmin>): Promise<AdminApiResponse<UserAdmin>> => {
  try {
    const response = await apiClient.post('/admin/users', user);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const toggleUserStatus = async (id: string): Promise<AdminApiResponse<any>> => {
  try {
    const response = await apiClient.put(`/admin/users/${id}/toggle-status`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const assignTenantRole = async (
  userId: string, 
  tenantId: string, 
  role: string
): Promise<AdminApiResponse<any>> => {
  try {
    const response = await apiClient.put(`/admin/users/${userId}/assign-tenant-role`, { tenantId, role });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const assignCollections = async (
  userId: string,
  tenantId: string,
  collections: string[]
): Promise<AdminApiResponse<any>> => {
  try {
    const response = await apiClient.put(`/admin/users/${userId}/assign-collections`, { tenantId, collections });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

// ==========================================
// SUPER ADMIN SUBSCRIPTIONS API
// ==========================================

export const getSubscriptionPlans = async (): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.get('/admin/subscriptions/plans');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

export const createSubscriptionPlan = async (data: any): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.post('/admin/subscriptions/plans', data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

export const updateSubscriptionPlan = async (id: string, data: any): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.patch(`/admin/subscriptions/plans/${id}`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

export const getPaymentGateways = async (): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.get('/admin/subscriptions/gateways');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

export const updatePaymentGateway = async (id: string, data: any): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.patch(`/admin/subscriptions/gateways/${id}`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

export const getTenantSubscriptionsStats = async (): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.get('/admin/subscriptions/tenant-stats');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

export const getTenantSubscriptions = async (): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.get('/admin/subscriptions/tenants');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};


export const updateTenantSubscription = async (tenantId: string, data: any): Promise<AdminApiResponse<any>> => {
  try {
    const res = await apiClient.patch(`/admin/subscriptions/tenants/${tenantId}`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error?.response?.data) };
  }
};

// Branding APIs
export const getBranding = async (institutionId: string): Promise<AdminApiResponse<BrandingConfig>> => {
  try {
    const response = await apiClient.get(`/admin/branding/${institutionId}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const updateBranding = async (institutionId: string, branding: BrandingConfig): Promise<AdminApiResponse<BrandingConfig>> => {
  try {
    const response = await apiClient.put(`/admin/branding/${institutionId}`, branding);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const publishBranding = async (institutionId: string): Promise<AdminApiResponse<BrandingConfig>> => {
  try {
    const response = await apiClient.post(`/admin/branding/${institutionId}/publish`, {
      version: new Date().toISOString()
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

export const revertBranding = async (institutionId: string): Promise<AdminApiResponse<BrandingConfig>> => {
  try {
    const response = await apiClient.post(`/admin/branding/${institutionId}/revert`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

/**
 * Get a presigned S3 upload URL for branding assets (logos, hero images, etc.)
 * Backend: GET /admin/branding/:id/upload-url?fileType=logo&contentType=image/png
 */
export const getBrandingUploadUrl = async (
  institutionId: string,
  fileType: string,
  contentType: string,
): Promise<AdminApiResponse<{ uploadUrl: string; key: string; bucket: string; publicUrl: string }>> => {
  try {
    const q = new URLSearchParams({ fileType, contentType }).toString();
    const response = await apiClient.get(`/admin/branding/${institutionId}/upload-url?${q}`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: extractErrorMessage(error.response?.data),
    };
  }
};

/**
 * Upload a file directly to S3 via presigned URL.
 * This is a raw PUT — it bypasses apiClient since the URL points to S3, not our API.
 */
export const uploadFileToPresignedUrl = async (
  presignedUrl: string,
  file: File,
): Promise<boolean> => {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    return response.ok;
  } catch {
    return false;
  }
};

// Audit logs APIs
export const getAuditLogs = async (params: {
  institutionId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  action?: string;
}): Promise<AdminApiResponse<AuditLog[]>> => {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });
    
    const url = `/admin/audit-logs?${queryParams.toString()}`;
    const response = await apiClient.get(url);
    return { success: true, data: response.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: extractErrorMessage(error.response?.data) 
    };
  }
};

// ==========================================
// SUPER ADMIN CATALOG API
// ==========================================

export const getGlobalCatalogBook = async (bookId: string) => {
  try {
    const res = await apiClient.get(`/admin/catalog/books/${bookId}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// Soft delete → moves the book to the Bin (recoverable). Nothing is flushed
// from storage/index/graph until it is purged from the Bin.
export const deleteGlobalCatalogBook = async (bookId: string) => {
  try {
    const res = await apiClient.delete(`/admin/catalog/books/${bookId}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// The Bin: soft-deleted books awaiting restore or permanent deletion.
export const getCatalogBin = async (params: { page?: number; limit?: number; search?: string } = {}) => {
  try {
    const cleanParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') cleanParams[key] = String(value);
    }
    const q = new URLSearchParams(cleanParams).toString();
    const res = await apiClient.get(`/admin/catalog/bin?${q}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const restoreCatalogBook = async (bookId: string) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/restore`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// Permanent, irreversible: flushes this book's R2 files, shared embeddings and
// entire graph, then deletes the row. Only allowed from the Bin.
export const purgeCatalogBook = async (bookId: string) => {
  try {
    const res = await apiClient.delete(`/admin/catalog/books/${bookId}/purge`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// One-shot: enqueue chapter-wise graph generation for ingested books that have
// no map yet (force=true rebuilds every ingested book's graph).
export const backfillCatalogGraphs = async (force = false) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/backfill-graphs${force ? '?force=true' : ''}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

/**
 * Delete a single format file from a book — the catalogue row and the object in
 * storage together. Returns `spineResidue: true` for enriched markdown, whose
 * embedded chunks live in the shared index and outlive the file.
 */
export const deleteGlobalCatalogBookFormat = async (bookId: string, formatId: string) => {
  try {
    const res = await apiClient.delete(`/admin/catalog/books/${bookId}/formats/${formatId}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getSuperAdminCatalogStats = async () => {
  try {
    const res = await apiClient.get('/admin/catalog/stats');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getGlobalCatalogBooks = async (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
  try {
    // Filter out undefined/null/empty values — URLSearchParams converts undefined to literal "undefined" string
    const cleanParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        cleanParams[key] = String(value);
      }
    }
    const q = new URLSearchParams(cleanParams).toString();
    const res = await apiClient.get(`/admin/catalog/books?${q}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getPendingCatalogApprovals = async (params: { page?: number; limit?: number } = {}) => {
  try {
    const cleanParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
      // `value` is number | undefined for this signature, so the old
      // `value !== ''` arm compared a number to a string and was unreachable.
      if (value !== undefined && value !== null) {
        cleanParams[key] = String(value);
      }
    }
    const q = new URLSearchParams(cleanParams).toString();
    const res = await apiClient.get(`/admin/catalog/pending?${q}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getGlobalPublishers = async () => {
  try {
    const res = await apiClient.get('/admin/catalog/publishers');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const updateGlobalPublishStatus = async (id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
  try {
    const res = await apiClient.patch(`/admin/catalog/books/${id}/status`, { status, rejectionReason });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const updateBookAccessTier = async (id: string, accessTier: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND') => {
  try {
    const res = await apiClient.patch(`/admin/catalog/books/${id}/tier`, { accessTier });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const toggleGlobalPublisherStatus = async (institutionId: string, isGlobalPublisher: boolean) => {
  try {
    const res = await apiClient.patch(`/admin/catalog/publishers/${institutionId}/toggle`, { isGlobalPublisher });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const createGlobalCatalogBook = async (bookData: {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  description?: string;
  publishYear?: number;
  language?: string;
  accessTier?: string;
  licenseType?: string;
  categoryIds?: string[];
}) => {
  try {
    const res = await apiClient.post('/admin/catalog/books', bookData);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// ── Catalog Book File Upload ──────────────────────────────────────────────────
export const getCatalogBookUploadUrl = async (bookId: string, format: string, filename: string, mimeType: string) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/upload-url`, { format, filename, mimeType });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const confirmCatalogBookUpload = async (bookId: string, data: {
  format: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  /**
   * Which chapter an enriched-markdown file is. Whole-book renditions (PDF,
   * EPUB, audiobook) omit it and occupy part 0; markdown carries the chapter
   * number from its own frontmatter, which is what lets one book hold many
   * chapter files instead of each upload replacing the last.
   */
  partIndex?: number;
}) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/confirm-upload`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

/**
 * Queue a book for ingestion into the shared content spine.
 *
 * NOT on the `/admin/*` proxy: that one rewrites to `/api/super-admin/*`, and
 * EmbeddingController lives at `/api/books/:id/embed`. It has its own route
 * handler, so this call bypasses `apiClient`'s baseURL deliberately.
 *
 * Uploading the markdown and indexing it are two steps on purpose — the upload
 * is cheap and reversible, the ingest spends embedding tokens and mutates the
 * shared spine. Surfacing a failed ingest separately means a bad markdown file
 * doesn't look like a failed upload.
 */
export const triggerBookEmbedding = async (bookId: string) => {
  try {
    const res = await fetch(`/api/books/${bookId}/embed`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: extractErrorMessage(body) };
    }
    return { success: true, data: body };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the ingestion service.' };
  }
};

export interface EmbeddingProgress {
  bookId: string;
  bookTitle: string;
  status: string;
  queueState: string | null;
  running: boolean;
  /** 0-100 while a job exists; null when there is nothing to measure. */
  progress: number | null;
  totalChunks: number;
  embeddedChunks: number;
  chapterCount: number;
  errorMessage: string | null;
  updatedAt: string | null;
}

/**
 * Live ingestion progress for one book. Polled while a run is in flight.
 *
 * Same dedicated route as `triggerBookEmbedding` and for the same reason — the
 * `/admin/*` proxy rewrites to `/api/super-admin/*`, which EmbeddingController
 * is not mounted under.
 */
export const getBookEmbeddingStatus = async (bookId: string) => {
  try {
    const res = await fetch(`/api/books/${bookId}/embedding-status`, {
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: extractErrorMessage(body) };
    }
    return { success: true, data: body as EmbeddingProgress };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the ingestion service.' };
  }
};

// ── Shared library: use a book already embedded in DigiClassroom ─────────────

/** A public work in the shared library (no passage text: titles, ids and counts only). */
export interface SharedWork {
  contentItemId: string;
  title: string;
  isbn: string | null;
  edition: string | null;
  lang: string | null;
  chunks: number;
  pageStart: number | null;
  pageEnd: number | null;
  /** Which apps already hold a record for this work (names only). */
  linkedApps: string[];
  /**
   * PDLMS's hub only: what it knows about the book, so it can be added with one click and nothing typed.
   * Absent for DigiClassroom, which holds no author.
   */
  author?: string | null;
  publisher?: string | null;
  publishYear?: number | null;
  pages?: number | null;
  /** 'pdf', 'epub', 'audiobook': the renditions the library holds. */
  formats?: string[];
}

/**
 * Browse the shared library's public works. Dedicated route, not the `/admin/*` proxy, for the
 * same reason as the embedding calls. The backend's message is passed through as the error: it
 * says whether the library is not set up, the secret was rejected, or DigiClassroom is down.
 */
export const listSharedWorks = async (query?: string) => {
  try {
    const params = new URLSearchParams();
    if (query?.trim()) params.set('q', query.trim());
    const res = await fetch(`/api/shared-library/works?${params}`, { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: extractErrorMessage(body), status: res.status };
    }
    return { success: true, data: (Array.isArray(body?.works) ? body.works : []) as SharedWork[] };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the library service.' };
  }
};

/** Whose shared library this is, and what the catalogue may offer for it. */
export interface SharedLibraryStatus {
  configured: boolean;
  owner: 'PDLMS' | 'DigiClassroom';
  /** True only for PDLMS's hub: DigiClassroom has no way to take a book off the library. */
  canUnlink: boolean;
}

export const getSharedLibraryStatus = async () => {
  try {
    const res = await fetch('/api/shared-library/status', { cache: 'no-store' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: extractErrorMessage(body), status: res.status };
    return { success: true, data: body as SharedLibraryStatus };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the library service.' };
  }
};

/** What happens to a book when it is taken off the shared library. */
export type UnlinkOutcome = 'retire' | 'keep';

/**
 * Take a book off the shared library (PDLMS's hub). Queues a job: 'retire' unlinks and moves the book
 * to the Bin in one step; 'keep' unlinks and keeps the book here. Progress is watched with
 * `getBookEmbeddingStatus`, which follows unlink jobs too.
 */
export const unlinkBookFromSharedWork = async (bookId: string, outcome: UnlinkOutcome) => {
  try {
    const res = await fetch(`/api/books/${bookId}/unlink-shared-work`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: extractErrorMessage(body) };
    return { success: true, data: body as { status: string; bookId: string; outcome: UnlinkOutcome } };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the library service.' };
  }
};

/** What "Refresh from library" did. `coverNote` says why a cover was not copied (kept, missing, or the error). */
export interface RefreshFromLibraryResult {
  status: string;
  bookId: string;
  formats: string[];
  cover: boolean;
  audioTracks: number;
  coverNote?: string;
}

/**
 * Bring a PDLMS-linked book up to date with the library: its PDF/EPUB and audio entries and its cover.
 * Done within the request, so the outcome (including why a cover was not copied) comes straight back.
 */
export const refreshBookFromLibrary = async (bookId: string) => {
  try {
    const res = await fetch(`/api/books/${bookId}/refresh-from-library`, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: extractErrorMessage(body) };
    return { success: true, data: body as RefreshFromLibraryResult };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the library service.' };
  }
};

/**
 * Queue a book to use an existing shared work. Nothing is embedded; progress is watched with
 * `getBookEmbeddingStatus`, which follows link jobs too.
 */
export const linkBookToSharedWork = async (bookId: string, contentItemId: string) => {
  try {
    const res = await fetch(`/api/books/${bookId}/link-shared-work`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentItemId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: extractErrorMessage(body) };
    }
    return { success: true, data: body };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the ingestion service.' };
  }
};

/**
 * Create a catalogue book from a shared work and queue its link. The author is required (the shared
 * library does not hold one); the title and language default to the work's. Returns the new book's id
 * and title so the caller can follow the link's progress.
 */
export const createBookFromSharedWork = async (input: {
  contentItemId: string;
  /** Optional: with PDLMS's hub the work's own author is used when this is left out. */
  author?: string;
  title?: string;
  language?: string;
}) => {
  try {
    const res = await fetch('/api/shared-library/create-book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: extractErrorMessage(body) };
    }
    return { success: true, data: body as { status: string; bookId: string; title: string } };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Could not reach the library service.' };
  }
};

// ── Catalog Metadata & Multi-Step Wizard ─────────────────────────────────────

export const getCatalogCategories = async (type?: string) => {
  try {
    const q = type ? `?type=${type}` : '';
    const res = await apiClient.get(`/admin/catalog/categories${q}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const createCatalogCategory = async (data: { name: string; type?: string; parentId?: string }) => {
  try {
    const res = await apiClient.post('/admin/catalog/categories', data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const updateCatalogBook = async (bookId: string, data: Partial<BookUpdatePayload>) => {
  const res = await apiClient.put(`/admin/catalog/books/${bookId}`, data);
  return res.data;
};

// ==========================================
// SHARED CURRICULUM TAXONOMY (cross-repo, Vidyaverse-hosted)
// Distinct from categories/genre above — board/class/subject/degree/exam
// classification used to scope RAG retrieval, not general reading genre.
// ==========================================

export const getTaxonomyTree = async (domain: string) => {
  try {
    const res = await apiClient.get(`/admin/catalog/taxonomy/tree?domain=${domain}`);
    return { success: true, data: res.data as any[] };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getBookTaxonomy = async (bookId: string) => {
  try {
    const res = await apiClient.get(`/admin/catalog/books/${bookId}/taxonomy`);
    return { success: true, data: res.data as { bookId: string; links: Array<{ nodeId: string; isPrimary: boolean }> } };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const setBookTaxonomy = async (
  bookId: string,
  links: Array<{ nodeId: string; isPrimary?: boolean }>,
) => {
  try {
    const res = await apiClient.put(`/admin/catalog/books/${bookId}/taxonomy`, { links });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getCoverUploadUrl = async (bookId: string, side: 'front' | 'back', filename: string, mimeType: string) => {
  try {
    const q = new URLSearchParams({ side, filename, mimeType }).toString();
    const res = await apiClient.get(`/admin/catalog/books/${bookId}/cover-upload-url?${q}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getSampleUploadUrl = async (bookId: string, filename: string, mimeType: string) => {
  try {
    const q = new URLSearchParams({ filename, mimeType }).toString();
    const res = await apiClient.get(`/admin/catalog/books/${bookId}/sample-upload-url?${q}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// ==========================================
// SUPER ADMIN STORAGE INTELLIGENCE API
// ==========================================

export const getStorageIntelligence = async () => {
  try {
    const res = await apiClient.get('/admin/storage/intelligence');
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const purgeTrash = async (tenantId?: string) => {
  try {
    const res = await apiClient.post('/admin/storage/purge-trash', { tenantId });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const notifyInstitution = async (tenantId: string, alertType: string) => {
  try {
    const res = await apiClient.post('/admin/storage/notify', { tenantId, alertType });
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

// ─── Audiobook Structure ────────────────────────────────────────

export const getAudiobookStructure = async (bookId: string) => {
  try {
    const res = await apiClient.get(`/admin/catalog/books/${bookId}/audiobook-structure`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const createChapter = async (bookId: string, data?: { title?: string; type?: 'INTRO' | 'SECTION' | 'APPENDIX' | 'CHAPTER' }) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/chapters`, data || {});
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const updateChapter = async (
  bookId: string,
  chapterId: string,
  data: { title?: string; type?: 'INTRO' | 'SECTION' | 'APPENDIX' | 'CHAPTER' }
) => {
  try {
    const res = await apiClient.patch(`/admin/catalog/books/${bookId}/chapters/${chapterId}`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const deleteChapter = async (bookId: string, chapterId: string) => {
  try {
    const res = await apiClient.delete(`/admin/catalog/books/${bookId}/chapters/${chapterId}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const createSection = async (bookId: string, chapterId: string, data?: { title?: string }) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/chapters/${chapterId}/sections`, data || {});
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const updateSection = async (
  bookId: string,
  chapterId: string,
  sectionId: string,
  data: { title?: string }
) => {
  try {
    const res = await apiClient.patch(`/admin/catalog/books/${bookId}/chapters/${chapterId}/sections/${sectionId}`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const reorderStructure = async (
  bookId: string,
  data: { chapters: { id: string; sortOrder: number }[]; sections: { id: string; sortOrder: number }[] }
) => {
  try {
    const res = await apiClient.put(`/admin/catalog/books/${bookId}/audiobook-structure/reorder`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const deleteSection = async (
  bookId: string,
  chapterId: string,
  sectionId: string
) => {
  try {
    const res = await apiClient.delete(`/admin/catalog/books/${bookId}/chapters/${chapterId}/sections/${sectionId}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const getAudioUploadUrl = async (
  bookId: string,
  sectionId: string,
  data: { gender: 'MALE' | 'FEMALE'; filename: string; mimeType: string }
) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/sections/${sectionId}/upload-url`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

export const saveAudioTracks = async (
  bookId: string,
  sectionId: string,
  data: { gender: 'MALE' | 'FEMALE'; fileUrl: string; durationSeconds: number; fileSizeBytes?: number }
) => {
  try {
    const res = await apiClient.post(`/admin/catalog/books/${bookId}/sections/${sectionId}/tracks`, data);
    return { success: true, data: res.data };
  } catch (error: any) {
    return { success: false, error: extractErrorMessage(error.response?.data) };
  }
};

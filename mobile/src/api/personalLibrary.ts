import { apiFetch } from './client';
import type {
  PersonalFile,
  PersonalFolder,
  PersonalLibraryContents,
  PersonalLibraryQuota,
  PresignUploadResult,
} from './types';

/** Uploads the backend will accept for a personal file. */
export const PERSONAL_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/epub+zip',
] as const;

/** GET /personal-library?folderId= — folders, files and breadcrumb for a level. */
export function getContents(folderId?: string | null) {
  const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : '';
  return apiFetch<PersonalLibraryContents>(`/personal-library${query}`);
}

export function searchPersonalLibrary(params: {
  q?: string;
  isStarred?: boolean;
  tags?: string;
}) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.isStarred) search.set('isStarred', 'true');
  if (params.tags) search.set('tags', params.tags);

  return apiFetch<PersonalFile[]>(`/personal-library/search?${search.toString()}`);
}

export function getStarred() {
  return apiFetch<PersonalFile[]>('/personal-library/starred');
}

export function getQuota() {
  return apiFetch<PersonalLibraryQuota>('/personal-library/quota');
}

export function createFolder(input: {
  name: string;
  parentId?: string | null;
  color?: string;
}) {
  return apiFetch<PersonalFolder>('/personal-library/folders', {
    method: 'POST',
    body: input,
  });
}

export function updateFolder(
  id: string,
  input: { name?: string; parentId?: string | null; color?: string | null; isStarred?: boolean },
) {
  return apiFetch<PersonalFolder>(`/personal-library/folders/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteFolder(id: string) {
  return apiFetch<unknown>(`/personal-library/folders/${id}`, { method: 'DELETE' });
}

/**
 * POST /personal-library/presign — reserve space and get an upload URL.
 *
 * This is where quota is enforced: too large, too many files, or not enough
 * space all fail here with a 400 before any bytes move. Surface that message
 * rather than a generic upload failure.
 */
export function presignUpload(input: {
  filename: string;
  mimeType: string;
  fileSize: number;
}) {
  return apiFetch<PresignUploadResult>('/personal-library/presign', {
    method: 'POST',
    body: input,
  });
}

export function confirmUpload(input: {
  storageKey: string;
  title: string;
  author?: string;
  format: string;
  mimeType: string;
  fileSize: number;
  folderId?: string;
}) {
  return apiFetch<PersonalFile>('/personal-library/confirm', {
    method: 'POST',
    body: input,
  });
}

export function updateFile(
  id: string,
  input: {
    title?: string;
    author?: string;
    folderId?: string | null;
    isStarred?: boolean;
    color?: string | null;
  },
) {
  return apiFetch<PersonalFile>(`/personal-library/files/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function deleteFile(id: string) {
  return apiFetch<unknown>(`/personal-library/files/${id}`, { method: 'DELETE' });
}

/** GET /personal-library/files/:id/read-url — presigned URL for the reader. */
export function getFileReadUrl(id: string) {
  return apiFetch<{ url: string; expiresAt?: string; format?: string }>(
    `/personal-library/files/${id}/read-url`,
  );
}

export function syncFileProgress(
  id: string,
  input: { currentPage: number; percentComplete: number; timeSpentSeconds?: number },
) {
  return apiFetch<unknown>(`/personal-library/files/${id}/progress`, {
    method: 'PATCH',
    body: input,
  });
}

/**
 * Uploads the picked file straight to object storage with the presigned PUT.
 *
 * The URL is a `PutObjectCommand` signature, so the body goes up raw with a
 * matching Content-Type — it is not a multipart POST policy, and adding form
 * fields would break the signature.
 */
export async function uploadToPresignedUrl(
  uploadUrl: string,
  fileUri: string,
  mimeType: string,
): Promise<void> {
  const fileResponse = await fetch(fileUri);
  const blob = await fileResponse.blob();

  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: blob,
    headers: { 'Content-Type': mimeType },
  });

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status})`);
  }
}

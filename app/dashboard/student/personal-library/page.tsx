'use client';

import { useState,useRef,useCallback,useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookCover } from '@/components/ui/book-cover';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon,type BBIconName } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { SearchInput } from '@/components/ui/search-input';
import { Segmented } from '@/components/ui/segmented';
import { Skeleton } from '@/components/ui/skeleton';
import {
Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

interface ReadingProgress {
  currentPage: number;
  percentComplete: number;
  lastReadAt: string;
  timeSpentSeconds: number;
}
interface PersonalFolder {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  isStarred: boolean;
  updatedAt: string;
  createdAt: string;
}
interface PersonalFile {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  format: 'pdf' | 'epub';
  mimeType: string;
  fileSize: number;
  storageKey: string;
  coverUrl: string | null;
  lastReadAt: string | null;
  progress: number;
  isStarred: boolean;
  folderId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  readingProgress?: ReadingProgress | null;
}
interface QuotaStatus {
  usedBytes: number;
  usedCount: number;
  maxStorageBytes: number;
  maxFileCount: number;
  maxSingleFileBytes: number;
  remainingBytes: number;
  remainingFiles: number;
}
interface UploadState {
  status: 'idle' | 'presigning' | 'uploading' | 'confirming' | 'done' | 'error';
  progress: number;
  filename: string;
  error?: string;
}
interface BreadcrumbItem {
  id: string;
  name: string;
}

// ── API helpers ──────────────────────────────────────────────────────────────

const API_BASE = '/api/proxy/personal-library';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Error ${res.status}`);
  return res.json();
}
async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Error ${res.status}`);
  return res.json();
}
async function apiPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Error ${res.status}`);
  return res.json();
}
async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || `Error ${res.status}`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function PersonalLibraryPage() {
  const router = useRouter();
  
  // Data state
  const [folders, setFolders] = useState<PersonalFolder[]>([]);
  const [files, setFiles] = useState<PersonalFile[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  
  // View state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'library' | 'starred' | 'recent'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Interaction state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', progress: 0, filename: '' });
  
  // Dialog state
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: string, type: 'file' | 'folder' } | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string, title?: string, author?: string, name?: string, type: 'file' | 'folder' } | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Info panel / bottom sheet
  const [infoPanelItem, setInfoPanelItem] = useState<(PersonalFile & { type: 'file' }) | (PersonalFolder & { type: 'folder' }) | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Mobile state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [contextMenuTarget, setContextMenuTarget] = useState<{ id: string, type: 'file' | 'folder', x: number, y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetching logic ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSelection(new Set()); 

      const [, quotaData] = await Promise.all([
        (async () => {
          if (searchQuery) {
            const data = await apiGet<{files: PersonalFile[], folders: PersonalFolder[]}>(`/search?q=${encodeURIComponent(searchQuery)}`);
            setFiles(data.files);
            setFolders(data.folders);
            setBreadcrumb([{ id: 'search', name: `Search: "${searchQuery}"` }]);
          } else if (activeTab === 'starred') {
            const data = await apiGet<{files: PersonalFile[], folders: PersonalFolder[]}>(`/search?isStarred=true`);
            setFiles(data.files);
            setFolders(data.folders);
            setBreadcrumb([{ id: 'starred', name: 'Starred Items' }]);
          } else {
            const qs = currentFolderId ? `?folderId=${currentFolderId}` : '';
            const data = await apiGet<{folder: any, folders: PersonalFolder[], files: PersonalFile[], breadcrumb: BreadcrumbItem[]}>(qs);
            setFiles(data.files);
            setFolders(data.folders);
            setBreadcrumb(data.breadcrumb || []);
          }
        })(),
        apiGet<QuotaStatus>('/quota').catch(() => null),
      ]);
      if (quotaData) setQuota(quotaData);

      setInfoPanelItem(prev => {
        if (!prev) return null;
        if (prev.type === 'file') {
          const fresh = files.find(f => f.id === prev.id);
          return fresh ? { ...fresh, type: 'file' } : prev;
        } else {
          const fresh = folders.find(f => f.id === prev.id);
          return fresh ? { ...fresh, type: 'folder' } : prev;
        }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load library');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, activeTab, searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => { fetchData(); }, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  // Close context menu on scroll/outside click
  useEffect(() => {
    if (!contextMenuTarget) return;
    const close = () => setContextMenuTarget(null);
    document.addEventListener('scroll', close, true);
    document.addEventListener('click', close);
    return () => { document.removeEventListener('scroll', close, true); document.removeEventListener('click', close); };
  }, [contextMenuTarget]);

  // Derived state
  const allTags = Array.from(new Set(files.flatMap(f => f.tags || []))).sort();

  // ── Navigation ─────────────────────────────────────────────────────────────

  const navigateToFolder = (id: string | null) => {
    setSearchQuery('');
    setActiveTab('library');
    setCurrentFolderId(id);
    setInfoPanelItem(null);
    setMobileSidebarOpen(false);
  };

  const handleTabChange = (tab: 'library' | 'starred' | 'recent') => {
    setSearchQuery('');
    setActiveTab(tab);
    setCurrentFolderId(null);
    setInfoPanelItem(null);
    setMobileSidebarOpen(false);
  };

  const toggleSelection = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    if ('stopPropagation' in e) e.stopPropagation();
    setSelection(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelection(new Set());

  // ── File Upload ────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = '';

    const allowedTypes = ['application/pdf', 'application/epub+zip'];
    if (!allowedTypes.includes(file.type)) {
      setUploadState({ status: 'error', progress: 0, filename: file.name, error: 'Only PDF and EPUB supported.' });
      return;
    }

    if (quota && file.size > quota.maxSingleFileBytes) {
      setUploadState({ status: 'error', progress: 0, filename: file.name, error: 'File too large.' });
      return;
    }

    try {
      setUploadState({ status: 'presigning', progress: 0, filename: file.name });
      const presignResult = await apiPost<{ uploadUrl: string; fields: Record<string, string>; storageKey: string; maxBytes: number }>(
        '/presign', { filename: file.name, mimeType: file.type, fileSize: file.size }
      );

      setUploadState({ status: 'uploading', progress: 0, filename: file.name });
      await new Promise<void>((resolve, reject) => {
        const formData = new FormData();
        Object.entries(presignResult.fields).forEach(([k, v]) => formData.append(k, v));
        formData.append('file', file);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', presignResult.uploadUrl, true);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadState(prev => ({ ...prev, progress: Math.round((e.loaded / e.total) * 100) }));
        };
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error('Upload failed')); };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      setUploadState({ status: 'confirming', progress: 100, filename: file.name });
      const format = file.type === 'application/pdf' ? 'pdf' : 'epub';
      await apiPost('/confirm', {
        storageKey: presignResult.storageKey,
        title: file.name.replace(/\.[^/.]+$/, ''),
        format,
        mimeType: file.type,
        fileSize: file.size,
        folderId: activeTab === 'library' ? currentFolderId : undefined
      });

      setUploadState({ status: 'done', progress: 100, filename: file.name });
      fetchData();
      setTimeout(() => setUploadState({ status: 'idle', progress: 0, filename: '' }), 3000);
    } catch (err: any) {
      setUploadState({ status: 'error', progress: 0, filename: file.name, error: err.message || 'Upload failed' });
    }
  }, [quota, fetchData, activeTab, currentFolderId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await apiPost('/folders', { name: newFolderName, parentId: currentFolderId });
      setNewFolderOpen(false);
      setNewFolderName('');
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      if (editingItem.type === 'file') {
        await apiPatch(`/files/${editingItem.id}`, { title: editingItem.title, author: editingItem.author });
      } else {
        await apiPatch(`/folders/${editingItem.id}`, { name: editingItem.name });
      }
      setEditingItem(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmId) return;
    try {
      if (deleteConfirmId.type === 'file') await apiDelete(`/files/${deleteConfirmId.id}`);
      else await apiDelete(`/folders/${deleteConfirmId.id}`);
      
      if (infoPanelItem?.id === deleteConfirmId.id) setInfoPanelItem(null);
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleToggleStar = async (e: React.MouseEvent, id: string, type: 'file'|'folder', isCurrentlyStarred: boolean) => {
    e.stopPropagation();
    try {
      if (type === 'file') await apiPatch(`/files/${id}`, { isStarred: !isCurrentlyStarred });
      else await apiPatch(`/folders/${id}`, { isStarred: !isCurrentlyStarred });
      
      if (infoPanelItem?.id === id) {
        setInfoPanelItem(prev => prev ? { ...prev, isStarred: !isCurrentlyStarred } : null);
      }
      fetchData();
    } catch (err: any) { console.error(err); }
  };

  const handleBulkDelete = async () => {
    if (!selection.size) return;
    if (!confirm(`Are you sure you want to delete ${selection.size} items?`)) return;
    try {
      const fileIds = Array.from(selection).filter(id => id.startsWith('file:')).map(id => id.replace('file:', ''));
      const folderIds = Array.from(selection).filter(id => id.startsWith('folder:')).map(id => id.replace('folder:', ''));
      await apiPost('/bulk', { action: 'delete', fileIds, folderIds });
      clearSelection();
      setInfoPanelItem(null);
      fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim() && infoPanelItem?.type === 'file') {
      const tag = newTagInput.trim().toLowerCase();
      setNewTagInput('');       
      const f = infoPanelItem as PersonalFile;
      if (f.tags?.includes(tag)) return;
      
      setInfoPanelItem({ ...f, tags: [...(f.tags || []), tag], type: 'file' });
      
      try {
        await apiPost('/bulk', { action: 'update-tags', fileIds: [f.id], tagsToAdd: [tag] });
        fetchData();
      } catch (err: any) { alert(err.message); }
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (infoPanelItem?.type === 'file') {
      const f = infoPanelItem as PersonalFile;
      setInfoPanelItem({ ...f, tags: f.tags?.filter(t => t !== tag), type: 'file' });
      try {
        await apiPost('/bulk', { action: 'update-tags', fileIds: [f.id], tagsToRemove: [tag] });
        fetchData();
      } catch (err: any) { alert(err.message); }
    }
  };

  // ── Long press handler factory ─────────────────────────────────────────────

  const openContextMenu = useCallback((id: string, type: 'file' | 'folder', touch: React.Touch) => {
    // Vibrate for haptic feedback if supported
    if (navigator.vibrate) navigator.vibrate(30);
    setContextMenuTarget({ id, type, x: touch.clientX, y: touch.clientY });
  }, []);

  // ── Render Helpers ─────────────────────────────────────────────────────────

  const isSelected = (id: string) => selection.has(id);

  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-bb-muted transition-colors hover:bg-bb-surface-2 hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';
  const metaLabel = 'text-xs font-bold uppercase tracking-[0.08em] text-bb-muted';

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ─────

  const sidebarContent = (
    <>
      <div className="p-5 pb-2">
        <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-extrabold tracking-[-0.02em]">
          <Icon name="library" size={24} /> My library
        </h2>

        <Button
          className="w-full"
          onClick={() => { fileInputRef.current?.click(); setMobileSidebarOpen(false); }}
        >
          <Icon name="upload" size={18} /> New upload
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.epub" className="hidden" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        <SidebarItem
          icon="folder"
          label="All files"
          active={activeTab === 'library' && !currentFolderId && !searchQuery}
          onClick={() => navigateToFolder(null)}
        />
        <SidebarItem icon="star" label="Starred" active={activeTab === 'starred'} onClick={() => handleTabChange('starred')} />
        <SidebarItem icon="calendar" label="Recent" active={activeTab === 'recent'} onClick={() => handleTabChange('recent')} />

        <div className="px-2 pb-2 pt-6">
          <h3 className={`${metaLabel} mb-2`}>Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {allTags.length === 0 && <p className="text-xs text-bb-muted">No tags assigned</p>}
            {allTags.map(tag => (
              <Chip key={tag} onClick={() => { setSearchQuery(tag); setMobileSidebarOpen(false); }}>
                {tag}
              </Chip>
            ))}
          </div>
        </div>
      </nav>

      {quota && (
        <div className="mx-4 mb-6 mt-auto rounded-2xl bg-bb-surface-2 p-4">
          <div className="mb-2 flex justify-between text-xs font-semibold">
            <span className="text-bb-muted">Storage</span>
            <span>{Math.round((quota.usedBytes / quota.maxStorageBytes) * 100)}%</span>
          </div>
          <Progress value={Math.min(100, (quota.usedBytes / quota.maxStorageBytes) * 100)} className="mb-2 h-1.5" />
          <p className="text-center text-[11px] text-bb-muted">
            {formatBytes(quota.usedBytes)} of {formatBytes(quota.maxStorageBytes)} used
          </p>
        </div>
      )}
    </>
  );

  // ── Info panel content (shared between desktop side-panel and mobile bottom sheet) ──

  const infoPanelContent = infoPanelItem && (
    <div className="flex-1 overflow-y-auto scroll-smooth p-5">
      <div className="mb-6 flex h-40 w-full items-center justify-center rounded-2xl bg-bb-surface-2">
        {infoPanelItem.type === 'file' ? (
          <BookCover title={infoPanelItem.title} coverUrl={infoPanelItem.coverUrl} width={84} />
        ) : (
          <Icon name="folder" size={56} />
        )}
      </div>

      <div className="mb-5">
        <h4 className="mb-1 font-display text-xl font-extrabold leading-tight tracking-[-0.02em]">
          {infoPanelItem.type === 'folder' ? infoPanelItem.name : infoPanelItem.title}
        </h4>
        {infoPanelItem.type === 'file' && infoPanelItem.author && <p className="text-sm text-bb-muted">{infoPanelItem.author}</p>}
      </div>

      {infoPanelItem.type === 'file' && (
        <Button
          className="mb-5 w-full"
          onClick={() => router.push(`/reader?personalFileId=${infoPanelItem.id}&format=${infoPanelItem.format}&tab=varta`)}
        >
          <Icon name="varta" size={18} /> Ask Varta
        </Button>
      )}

      <div className="mb-6 space-y-3">
        <h5 className={metaLabel}>Properties</h5>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-bb-muted">Type</dt><dd className="font-medium capitalize">{infoPanelItem.type === 'folder' ? 'Folder' : `${infoPanelItem.format.toUpperCase()} document`}</dd></div>
          {infoPanelItem.type === 'file' && <div className="flex justify-between"><dt className="text-bb-muted">Size</dt><dd className="font-medium">{formatBytes(infoPanelItem.fileSize)}</dd></div>}
          <div className="flex justify-between"><dt className="text-bb-muted">Created</dt><dd className="font-medium">{new Date(infoPanelItem.createdAt).toLocaleDateString()}</dd></div>
          <div className="flex justify-between"><dt className="text-bb-muted">Modified</dt><dd className="font-medium">{new Date(infoPanelItem.updatedAt).toLocaleDateString()}</dd></div>
          {infoPanelItem.type === 'file' && infoPanelItem.lastReadAt && (
            <div className="flex justify-between"><dt className="text-bb-muted">Last read</dt><dd className="font-medium">{new Date(infoPanelItem.lastReadAt).toLocaleDateString()}</dd></div>
          )}
        </dl>
      </div>

      {infoPanelItem.type === 'file' && (
        <div className="mb-6 space-y-3">
          <h5 className={`${metaLabel} flex items-center gap-1.5`}><Icon name="tag" size={14} /> Tags</h5>
          <div className="flex flex-wrap gap-2">
            {infoPanelItem.tags?.map(tag => (
              <Chip key={tag} onRemove={() => handleRemoveTag(tag)}>{tag}</Chip>
            ))}
            {(!infoPanelItem.tags || infoPanelItem.tags.length === 0) && <span className="text-xs text-bb-muted">No tags.</span>}
          </div>
          <Input
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag and press Enter"
            className="h-10 text-sm"
          />
        </div>
      )}

      <div className="space-y-3">
        <h5 className={metaLabel}>Actions</h5>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setEditingItem({ id: infoPanelItem.id, type: infoPanelItem.type, name: infoPanelItem.type === 'folder' ? infoPanelItem.name : undefined, title: infoPanelItem.type === 'file' ? infoPanelItem.title : undefined, author: infoPanelItem.type === 'file' ? infoPanelItem.author || '' : undefined })}
          >
            <Icon name="edit" size={16} /> Edit
          </Button>
          <Button
            variant="danger-soft"
            size="sm"
            className="flex-1"
            onClick={() => setDeleteConfirmId({ id: infoPanelItem.id, type: infoPanelItem.type })}
          >
            <Icon name="trash" size={16} /> Delete
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full w-full overflow-hidden rounded-[22px] bg-bb-surface text-bb-text shadow-e1">

      {/* Mobile sidebar drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
          <div className="absolute inset-0 bg-bb-ink/40 backdrop-blur-sm" />
          <aside
            className="absolute bottom-0 left-0 top-0 flex w-72 flex-col bg-bb-surface shadow-e2"
            style={{ animation: 'slideInFromLeft 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-bb-border bg-bb-bg md:flex">
        {sidebarContent}
      </aside>

      <div className="relative flex min-w-0 flex-1 overflow-hidden">
        <main className="relative flex min-w-0 flex-1 flex-col">

          {/* Header toolbar */}
          <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-bb-border bg-bb-surface px-4 md:h-16 md:px-6">
            <button onClick={() => setMobileSidebarOpen(true)} className={`${iconBtn} -ml-1 md:hidden`} aria-label="Open menu">
              <Icon name="menu" size={20} />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto md:gap-2 [scrollbar-width:none]">
              <button onClick={() => navigateToFolder(null)} className="flex-shrink-0 text-sm font-medium text-bb-muted hover:text-bb-text md:text-base">
                Home
              </button>
              {breadcrumb.map((crumb) => (
                <div key={crumb.id} className="flex flex-shrink-0 items-center gap-1.5">
                  <Icon name="chevron-right" size={14} />
                  <button
                    onClick={() => crumb.id !== 'search' && crumb.id !== 'starred' ? navigateToFolder(crumb.id) : null}
                    className="max-w-[100px] truncate text-sm font-semibold hover:text-bb-accent-ink md:max-w-[150px] md:text-base"
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className={`${iconBtn} sm:hidden`} aria-label="Search">
                <Icon name="search" size={20} />
              </button>

              <SearchInput
                wrapperClassName="hidden w-64 sm:block"
                className="h-10 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files & tags"
              />

              <Segmented
                value={viewMode}
                onValueChange={setViewMode}
                size="sm"
                options={[
                  { value: 'grid', label: 'Grid' },
                  { value: 'list', label: 'List' },
                ]}
                aria-label="View mode"
              />

              {activeTab === 'library' && !searchQuery && (
                <button onClick={() => setNewFolderOpen(true)} className={`${iconBtn} hidden sm:inline-flex`} title="New folder" aria-label="New folder">
                  <Icon name="folder" size={20} />
                </button>
              )}
            </div>
          </header>

          {/* Mobile search bar */}
          {mobileSearchOpen && (
            <div className="border-b border-bb-border bg-bb-surface px-4 py-2 sm:hidden">
              <SearchInput
                autoFocus
                className="h-10 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search files & tags"
              />
            </div>
          )}

          {/* Multi-select action bar */}
          {selection.size > 0 && (
            <div className="absolute left-1/2 top-16 z-30 flex -translate-x-1/2 items-center gap-4 rounded-full bg-bb-navy px-5 py-2.5 text-white shadow-[var(--bb-shadow-navy)] md:top-20">
              <span className="text-sm font-bold">{selection.size} selected</span>
              <span className="h-5 w-px bg-white/25" />
              <button onClick={handleBulkDelete} className="rounded-full p-2 hover:bg-white/10" aria-label="Delete selected">
                <Icon name="trash" size={18} />
              </button>
              <button onClick={clearSelection} className="rounded-full p-2 hover:bg-white/10" aria-label="Clear selection">
                <Icon name="close" size={18} />
              </button>
            </div>
          )}

          {/* Upload banner */}
          {uploadState.status !== 'idle' && (
            <div
              role="status"
              className={`relative z-10 mx-4 mt-4 flex items-center gap-3 rounded-2xl p-3 md:mx-6 md:gap-4 md:p-4 ${
                uploadState.status === 'error' ? 'bg-bb-danger-soft text-bb-danger-ink' : uploadState.status === 'done' ? 'bg-bb-success-soft text-bb-success-ink' : 'bg-bb-surface-2'
              }`}
            >
              {uploadState.status === 'error' ? <Icon name="alert-circle" size={20} className="shrink-0" /> :
               uploadState.status === 'done' ? <Icon name="check-circle" size={20} className="shrink-0" /> :
               <Icon name="loader" size={20} className="shrink-0 animate-spin" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {uploadState.status === 'uploading'
                    ? `Uploading ${uploadState.filename} · ${uploadState.progress}%`
                    : uploadState.status === 'error'
                      ? `${uploadState.filename}: ${uploadState.error}`
                      : uploadState.status}
                </p>
                {uploadState.status === 'uploading' && <Progress value={uploadState.progress} className="mt-2 h-1.5" />}
              </div>
              <button onClick={() => setUploadState({ status: 'idle', progress: 0, filename: '' })} className="shrink-0 rounded p-1 hover:bg-black/5" aria-label="Dismiss">
                <Icon name="close" size={16} />
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div className="relative flex-1 overflow-y-auto scroll-smooth bg-bb-bg p-4 md:p-8" onClick={clearSelection}>
            {isLoading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-6 xl:grid-cols-4 2xl:grid-cols-5' : 'flex flex-col gap-3'}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className={viewMode === 'grid' ? 'h-56 rounded-[18px]' : 'h-20 rounded-[18px]'} />
                ))}
              </div>
            ) : error ? (
              <div role="alert" className="mx-auto max-w-md rounded-[18px] bg-bb-danger-soft p-8 text-center text-sm font-semibold text-bb-danger-ink">
                {error}
                <div className="mt-4">
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); fetchData(); }}>Retry</Button>
                </div>
              </div>
            ) : (folders.length === 0 && files.length === 0) ? (
              <EmptyState
                className="mx-auto h-full max-w-md"
                icon="folder"
                title="It's empty here"
                description="Upload files or create folders to organize your personal reading library."
                action={
                  <Button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                    <Icon name="upload" size={18} /> Upload document
                  </Button>
                }
              />
            ) : (
              <div className={`gap-3 md:gap-6 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'flex flex-col'}`}>
                {folders.map(folder => {
                  const sid = `folder:${folder.id}`;
                  return (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      viewMode={viewMode}
                      selected={isSelected(sid)}
                      highlighted={infoPanelItem?.id === folder.id}
                      onNavigate={() => navigateToFolder(folder.id)}
                      onSelect={(e) => toggleSelection(e, sid)}
                      onInfo={() => setInfoPanelItem({ ...folder, type: 'folder' })}
                      onStar={(e) => handleToggleStar(e, folder.id, 'folder', folder.isStarred)}
                      onLongPress={(touch) => openContextMenu(folder.id, 'folder', touch)}
                    />
                  );
                })}

                {files.map(file => {
                  const sid = `file:${file.id}`;
                  return (
                    <FileCard
                      key={file.id}
                      file={file}
                      viewMode={viewMode}
                      selected={isSelected(sid)}
                      highlighted={infoPanelItem?.id === file.id}
                      onOpen={() => router.push(`/reader?personalFileId=${file.id}&format=${file.format}`)}
                      onSelect={(e) => toggleSelection(e, sid)}
                      onInfo={() => setInfoPanelItem({ ...file, type: 'file' })}
                      onStar={(e) => handleToggleStar(e, file.id, 'file', file.isStarred)}
                      onLongPress={(touch) => openContextMenu(file.id, 'file', touch)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile FAB (upload + new folder) */}
          <div className="fixed bottom-24 right-5 z-30 flex flex-col items-end gap-3 md:hidden">
            {activeTab === 'library' && !searchQuery && (
              <Button variant="glass" size="icon-md" onClick={() => setNewFolderOpen(true)} aria-label="New folder" className="shadow-e2">
                <Icon name="folder" size={20} />
              </Button>
            )}
            <Button size="icon" onClick={() => fileInputRef.current?.click()} aria-label="Upload">
              <Icon name="plus" size={24} />
            </Button>
          </div>
        </main>

        {/* Desktop info panel */}
        {infoPanelItem && (
          <aside className="hidden w-80 shrink-0 flex-col border-l border-bb-border bg-bb-surface md:flex">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-bb-border px-4">
              <h3 className="flex items-center gap-2 font-semibold"><Icon name="info" size={20} /> Details</h3>
              <button onClick={() => setInfoPanelItem(null)} className={iconBtn} aria-label="Close details">
                <Icon name="close" size={16} />
              </button>
            </div>
            {infoPanelContent}
          </aside>
        )}
      </div>

      {/* Mobile bottom sheet (info panel on small screens) */}
      {infoPanelItem && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setInfoPanelItem(null)}>
          <div className="absolute inset-0 bg-bb-ink/30 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[85vh] flex-col rounded-t-[28px] bg-bb-surface shadow-e2"
            style={{ animation: 'slideUpSheet 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex shrink-0 justify-center pb-2 pt-3">
              <div className="h-1.5 w-10 rounded-full bg-bb-border" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-bb-border px-5 pb-3">
              <h3 className="flex items-center gap-2 font-semibold"><Icon name="info" size={20} /> Details</h3>
              <button onClick={() => setInfoPanelItem(null)} className={iconBtn} aria-label="Close details">
                <Icon name="close" size={16} />
              </button>
            </div>
            {infoPanelContent}
          </div>
        </div>
      )}

      {/* Mobile context menu (long-press popup) */}
      {contextMenuTarget && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenuTarget(null)}>
          <div
            className="absolute min-w-[190px] rounded-2xl bg-bb-surface py-2 shadow-e2"
            style={{
              top: Math.min(contextMenuTarget.y, window.innerHeight - 280),
              left: Math.min(contextMenuTarget.x - 90, window.innerWidth - 200),
              animation: 'scaleIn 0.15s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <ContextMenuItem icon="info" label="Details" onClick={() => {
              const item = [...files, ...folders as any[]].find(i => i.id === contextMenuTarget.id);
              if (item) {
                setInfoPanelItem({ ...item, type: contextMenuTarget.type });
              }
              setContextMenuTarget(null);
            }} />
            <ContextMenuItem icon="star" label="Toggle star" onClick={(e) => {
              const item = contextMenuTarget.type === 'file'
                ? files.find(f => f.id === contextMenuTarget.id)
                : folders.find(f => f.id === contextMenuTarget.id);
              if (item) handleToggleStar(e as React.MouseEvent, item.id, contextMenuTarget.type, item.isStarred);
              setContextMenuTarget(null);
            }} />
            <ContextMenuItem icon="edit" label="Rename" onClick={() => {
              const item = contextMenuTarget.type === 'file'
                ? files.find(f => f.id === contextMenuTarget.id)
                : folders.find(f => f.id === contextMenuTarget.id);
              if (item) {
                if (contextMenuTarget.type === 'folder') {
                  setEditingItem({ id: item.id, name: (item as PersonalFolder).name, type: 'folder' });
                } else {
                  const file = item as PersonalFile;
                  setEditingItem({ id: file.id, title: file.title, author: file.author || '', type: 'file' });
                }
              }
              setContextMenuTarget(null);
            }} />
            <ContextMenuItem icon="check" label="Select" onClick={() => {
              const prefix = contextMenuTarget.type === 'file' ? 'file:' : 'folder:';
              setSelection(prev => { const n = new Set(prev); n.add(prefix + contextMenuTarget.id); return n; });
              setContextMenuTarget(null);
            }} />
            <div className="mx-3 my-1 border-t border-bb-border" />
            <ContextMenuItem icon="trash" label="Delete" danger onClick={() => {
              setDeleteConfirmId({ id: contextMenuTarget.id, type: contextMenuTarget.type });
              setContextMenuTarget(null);
            }} />
          </div>
        </div>
      )}

      {/* New folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create new folder</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Folder name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
          <DialogFooter><Button onClick={handleCreateFolder}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit form */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename {editingItem?.type === 'folder' ? 'folder' : 'file'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {editingItem?.type === 'folder' ? (
              <Input value={editingItem.name || ''} onChange={e => editingItem && setEditingItem({...editingItem, name: e.target.value, type: 'folder'})} />
            ) : (
              <>
                <Input value={editingItem?.title || ''} onChange={e => editingItem && setEditingItem({...editingItem, title: e.target.value, type: 'file'})} placeholder="Title" />
                <Input value={editingItem?.author || ''} onChange={e => editingItem && setEditingItem({...editingItem, author: e.target.value, type: 'file'})} placeholder="Author" />
              </>
            )}
          </div>
          <DialogFooter><Button onClick={handleSaveEdit}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete item</DialogTitle>
            <DialogDescription>This action will permanently delete the {deleteConfirmId?.type} and all its contents if it is a folder.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteItem}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="slideInFromLeft"], [style*="slideUpSheet"], [style*="scaleIn"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-Components
// ══════════════════════════════════════════════════════════════════════════════

function SidebarItem({ icon, label, active, onClick }: { icon: BBIconName; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
        active ? 'bg-bb-accent-soft text-bb-accent-ink' : 'text-bb-muted hover:bg-bb-surface-2 hover:text-bb-text'
      }`}
    >
      <Icon name={icon} size={20} />
      {label}
    </button>
  );
}

function ContextMenuItem({ icon, label, onClick, danger }: { icon: BBIconName; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-bb-surface-2 ${danger ? 'text-bb-danger-ink' : ''}`}
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

const cardBase =
  'group relative cursor-pointer select-none bg-bb-surface shadow-e1 transition-[transform,box-shadow] duration-bb-ui ease-bb';
const cardSelected = 'ring-2 ring-bb-accent bg-bb-accent-soft';
const cardHighlighted = 'ring-2 ring-bb-border';
const hoverActions =
  'absolute right-2 top-2 hidden items-center rounded-full bg-bb-surface/90 shadow-e1 backdrop-blur md:flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100';
const hoverBtn = 'inline-flex h-8 w-8 items-center justify-center rounded-full text-bb-muted hover:text-bb-text focus-visible:outline-none focus-visible:shadow-focus';

function SelectTick() {
  return (
    <div className="absolute left-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-bb-primary text-white shadow-e1 md:left-3 md:top-3">
      <Icon name="check" size={16} />
    </div>
  );
}

function StarBtn({ starred, onClick }: { starred: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(e); }} className={hoverBtn} aria-label={starred ? 'Unstar' : 'Star'} aria-pressed={starred}>
      <Icon name="star" size={16} className={starred ? 'text-bb-accent' : undefined} />
    </button>
  );
}

// ── Folder Card ──────────────────────────────────────────────────────────────

function FolderCard({ folder, viewMode, selected, highlighted, onNavigate, onSelect, onInfo, onStar, onLongPress }: {
  folder: PersonalFolder; viewMode: 'grid' | 'list'; selected: boolean; highlighted: boolean;
  onNavigate: () => void; onSelect: (e: React.MouseEvent) => void;
  onInfo: () => void; onStar: (e: React.MouseEvent) => void;
  onLongPress: (touch: React.Touch) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const cancel = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (didLongPress.current) { didLongPress.current = false; return; } if (e.ctrlKey || e.metaKey) onSelect(e); else onNavigate(); }}
      onTouchStart={(e) => {
        didLongPress.current = false;
        const touch = e.touches[0];
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          if (navigator.vibrate) navigator.vibrate(30);
          onLongPress(touch);
        }, 500);
      }}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      onTouchMove={cancel}
      className={`${cardBase} flex rounded-[18px] ${viewMode === 'grid' ? 'flex-col items-center p-4 text-center md:p-6' : 'flex-row items-center p-3 text-left md:p-4'} ${selected ? cardSelected : 'md:hover:-translate-y-0.5 md:hover:shadow-e2'} ${highlighted ? cardHighlighted : ''}`}
    >
      <span className={`${viewMode === 'grid' ? 'mb-3 h-14 w-14 md:mb-4 md:h-16 md:w-16' : 'mr-3 h-11 w-11 md:mr-4'} flex shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft`}>
        <Icon name="folder" size={viewMode === 'grid' ? 32 : 22} />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-semibold md:text-base">{folder.name}</h4>
        {viewMode === 'list' && <p className="mt-0.5 text-xs text-bb-muted">Folder · {new Date(folder.updatedAt).toLocaleDateString()}</p>}
      </div>

      <div className={hoverActions}>
        <button onClick={(e) => { e.stopPropagation(); onInfo(); }} className={hoverBtn} aria-label="Details"><Icon name="info" size={16} /></button>
        <StarBtn starred={folder.isStarred} onClick={onStar} />
      </div>

      {folder.isStarred && (
        <div className="absolute right-2 top-2 md:hidden"><Icon name="star" size={14} className="text-bb-accent" /></div>
      )}
      {selected && <SelectTick />}
    </div>
  );
}

// ── File Card ────────────────────────────────────────────────────────────────

function FileCard({ file, viewMode, selected, highlighted, onOpen, onSelect, onInfo, onStar, onLongPress }: {
  file: PersonalFile; viewMode: 'grid' | 'list'; selected: boolean; highlighted: boolean;
  onOpen: () => void; onSelect: (e: React.MouseEvent) => void;
  onInfo: () => void; onStar: (e: React.MouseEvent) => void;
  onLongPress: (touch: React.Touch) => void;
}) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const cancel = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const pct = Math.min(100, Math.round(file.progress * 100));

  return (
    <div
      onClick={(e) => { e.stopPropagation(); if (didLongPress.current) { didLongPress.current = false; return; } if (e.ctrlKey || e.metaKey) onSelect(e); else onOpen(); }}
      onTouchStart={(e) => {
        didLongPress.current = false;
        const touch = e.touches[0];
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          if (navigator.vibrate) navigator.vibrate(30);
          onLongPress(touch);
        }, 500);
      }}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      onTouchMove={cancel}
      className={`${cardBase} flex overflow-hidden rounded-[18px] ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center gap-3 p-3'} ${selected ? cardSelected : 'md:hover:-translate-y-0.5 md:hover:shadow-e2'} ${highlighted ? cardHighlighted : ''}`}
    >
      {viewMode === 'grid' ? (
        <div className="relative flex h-48 items-center justify-center bg-bb-surface-2">
          <BookCover title={file.title} subject={file.format} coverUrl={file.coverUrl} width={96} />
          <span className="absolute left-2 top-2 md:left-3 md:top-3">
            {!selected && <Chip className="h-6 bg-bb-surface/90 text-[11px]">{file.format.toUpperCase()}</Chip>}
          </span>
        </div>
      ) : (
        <BookCover title={file.title} subject={file.format} coverUrl={file.coverUrl} width={40} />
      )}

      <div className={`flex min-w-0 flex-1 flex-col ${viewMode === 'grid' ? 'p-3 md:p-4' : ''}`}>
        <h4 className="truncate text-sm font-semibold md:text-base">{file.title}</h4>
        <p className="mt-0.5 truncate text-xs text-bb-muted">{file.author || 'Unknown author'}</p>

        {viewMode === 'grid' ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-bb-muted">{formatBytes(file.fileSize)}</span>
            <span className="text-xs font-bold text-bb-accent-ink">{file.progress > 0 ? `${pct}%` : 'New'}</span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-3 text-xs text-bb-muted">
            <span>{formatBytes(file.fileSize)}</span>
            <span>{file.format.toUpperCase()}</span>
            {file.progress > 0 && <span className="ml-auto pr-8 font-bold text-bb-accent-ink">{pct}%</span>}
          </div>
        )}
      </div>

      {file.progress > 0 && viewMode === 'grid' && <Progress value={pct} className="h-1 rounded-none" />}

      <div className={`${hoverActions} ${viewMode === 'list' ? 'top-1/2 -translate-y-1/2' : ''}`}>
        <button onClick={(e) => { e.stopPropagation(); onInfo(); }} className={hoverBtn} aria-label="Details"><Icon name="info" size={16} /></button>
        <StarBtn starred={file.isStarred} onClick={onStar} />
      </div>

      {file.isStarred && (
        <div className="absolute right-2 top-2 md:hidden"><Icon name="star" size={14} className="text-bb-accent" /></div>
      )}
      {selected && <SelectTick />}
    </div>
  );
}

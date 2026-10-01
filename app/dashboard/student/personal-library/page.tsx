'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, Search, Trash2, Upload, FileText, FileUp, Library, Clock,
  ArrowRight, X, AlertCircle, CheckCircle2, Loader2, HardDrive, Edit3, 
  Check, Folder, FolderPlus, MoreVertical, Star, List, Grid, ChevronRight, 
  Plus, UploadCloud, FolderOpen, Settings2, Info, Bot, Tag, Menu, ChevronDown
} from '@/components/ui/icons';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
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

// ── Long-press hook ──────────────────────────────────────────────────────────

function useLongPress(callback: () => void, ms = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const start = useCallback(() => {
    didLongPressRef.current = false;
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      callback();
    }, ms);
  }, [callback, ms]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchCancel: stop,
    didLongPress: didLongPressRef,
  };
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

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ─────

  const sidebarContent = (
    <>
      <div className="p-5 pb-2">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-5" style={{ fontFamily: 'var(--font-display)' }}>
          <Library className="w-6 h-6 text-[var(--peacock-teal)]" /> My Library
        </h2>
        
        <button 
          onClick={() => { fileInputRef.current?.click(); setMobileSidebarOpen(false); }}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--peacock-teal)] to-[var(--deep-saffron)] text-white font-bold rounded-xl py-3 shadow-lg hover:shadow-xl hover:opacity-90 transition-all active:scale-95"
        >
          <UploadCloud className="w-5 h-5" /> New Upload
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.epub" className="hidden" />
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <SidebarItem 
          icon={<FolderOpen className="w-5 h-5" />} 
          label="All Files" 
          active={activeTab === 'library' && !currentFolderId && !searchQuery} 
          onClick={() => navigateToFolder(null)} 
        />
        <SidebarItem 
          icon={<Star className="w-5 h-5" />} 
          label="Starred" 
          active={activeTab === 'starred'} 
          onClick={() => handleTabChange('starred')} 
        />
        <SidebarItem 
          icon={<Clock className="w-5 h-5" />} 
          label="Recent" 
          active={activeTab === 'recent'} 
          onClick={() => handleTabChange('recent')} 
        />
        
        <div className="pt-6 pb-2 px-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5 px-1">
            {allTags.length === 0 && <div className="text-xs text-slate-400 italic">No tags assigned</div>}
            {allTags.map(tag => (
              <button 
                key={tag} 
                onClick={() => { setSearchQuery(tag); setMobileSidebarOpen(false); }}
                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded hover:bg-[var(--peacock-teal)] hover:text-white transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Quota Widget */}
      {quota && (
        <div className="p-4 mx-4 mb-6 mt-auto rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex justify-between text-xs font-semibold mb-2">
            <span className="text-slate-500">Storage</span>
            <span className="text-[var(--peacock-teal)]">{Math.round((quota.usedBytes/quota.maxStorageBytes)*100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-2">
             <div 
               className="h-full bg-gradient-to-r from-[var(--peacock-teal)] to-[var(--deep-saffron)]" 
               style={{ width: `${Math.min(100, (quota.usedBytes/quota.maxStorageBytes)*100)}%` }} 
             />
          </div>
          <p className="text-[10px] text-slate-500 text-center">{formatBytes(quota.usedBytes)} of {formatBytes(quota.maxStorageBytes)} used</p>
        </div>
      )}
    </>
  );

  // ── Info panel content (shared between desktop side-panel and mobile bottom sheet) ──

  const infoPanelContent = infoPanelItem && (
    <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
       {/* Visual Preview */}
       <div className="h-32 md:h-40 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 mb-6 flex items-center justify-center border border-slate-200 dark:border-slate-700">
         {infoPanelItem.type === 'file' ? (
           infoPanelItem.format === 'pdf' ? <FileText className="w-14 h-14 text-red-500 opacity-80" /> : <FileUp className="w-14 h-14 text-emerald-500 opacity-80" />
         ) : (
           <Folder className="w-14 h-14 text-blue-500 opacity-80" />
         )}
       </div>

       {/* Meta Info */}
       <div className="mb-5">
         <h4 className="text-lg md:text-xl font-bold leading-tight mb-1">{infoPanelItem.type === 'folder' ? infoPanelItem.name : infoPanelItem.title}</h4>
         {infoPanelItem.type === 'file' && infoPanelItem.author && <p className="text-sm text-slate-500">{infoPanelItem.author}</p>}
       </div>

       {/* Varta Integration */}
       {infoPanelItem.type === 'file' && (
         <button 
           onClick={() => router.push(`/dashboard/student/varta?personalFileId=${infoPanelItem.id}&title=${encodeURIComponent(infoPanelItem.title)}`)}
           className="w-full mb-5 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold p-3 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
         >
           <Bot className="w-5 h-5" /> Ask Varta
         </button>
       )}

       <div className="space-y-3 mb-6">
         <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Properties</h5>
         <div className="space-y-2 text-sm">
           <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{infoPanelItem.type === 'folder' ? 'Folder' : infoPanelItem.format.toUpperCase()} Document</span></div>
           {infoPanelItem.type === 'file' && <div className="flex justify-between"><span className="text-slate-500">Size</span><span className="font-medium">{formatBytes(infoPanelItem.fileSize)}</span></div>}
           <div className="flex justify-between"><span className="text-slate-500">Created</span><span className="font-medium">{new Date(infoPanelItem.createdAt).toLocaleDateString()}</span></div>
           <div className="flex justify-between"><span className="text-slate-500">Modified</span><span className="font-medium">{new Date(infoPanelItem.updatedAt).toLocaleDateString()}</span></div>
           {infoPanelItem.type === 'file' && infoPanelItem.lastReadAt && (
              <div className="flex justify-between"><span className="text-slate-500">Last Read</span><span className="font-medium">{new Date(infoPanelItem.lastReadAt).toLocaleDateString()}</span></div>
           )}
         </div>
       </div>

       {/* Tags System */}
       {infoPanelItem.type === 'file' && (
         <div className="space-y-3 mb-6">
           <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Tag className="w-3.5 h-3.5"/> Tags</h5>
           <div className="flex flex-wrap gap-2">
             {infoPanelItem.tags?.map(tag => (
               <Badge key={tag} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border-none font-medium text-xs flex items-center gap-1">
                 {tag}
                 <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 ml-1 rounded-full"><X className="w-3 h-3 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-full" /></button>
               </Badge>
             ))}
             {(!infoPanelItem.tags || infoPanelItem.tags.length === 0) && <span className="text-xs italic text-slate-400">No tags.</span>}
           </div>
           <Input 
             value={newTagInput} 
             onChange={e => setNewTagInput(e.target.value)} 
             onKeyDown={handleAddTag} 
             placeholder="Add tag and press Enter..." 
             className="text-xs h-8 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
           />
         </div>
       )}

       {/* Actions block */}
       <div className="space-y-3">
         <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</h5>
         <div className="flex flex-wrap gap-2">
           <button onClick={() => setEditingItem({ id: infoPanelItem.id, type: infoPanelItem.type, name: infoPanelItem.type === 'folder' ? infoPanelItem.name : undefined, title: infoPanelItem.type === 'file' ? infoPanelItem.title : undefined, author: infoPanelItem.type === 'file' ? infoPanelItem.author || '' : undefined })} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-sm transition-colors text-slate-700 dark:text-slate-300 active:scale-95">
             <Edit3 className="w-4 h-4" /> Edit
           </button>
           <button onClick={() => setDeleteConfirmId({ id: infoPanelItem.id, type: infoPanelItem.type })} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold text-sm transition-colors active:scale-95">
             <Trash2 className="w-4 h-4" /> Delete
           </button>
         </div>
       </div>
    </div>
  );

  return (
    <div className="flex h-full w-full bg-slate-50 dark:bg-bb-bg text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      
      {/* ══════════════════════════════════════════════════════════════════
           MOBILE SIDEBAR DRAWER (overlay)
         ══════════════════════════════════════════════════════════════════ */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSidebarOpen(false)}>
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-vg-fade-in" />
          {/* Drawer */}
          <aside 
            className="absolute top-0 left-0 bottom-0 w-72 bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            style={{ animation: 'slideInFromLeft 0.25s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}
      
      {/* ══════════════════════════════════════════════════════════════════
           DESKTOP SIDEBAR (persistent)
         ══════════════════════════════════════════════════════════════════ */}
      <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/40 backdrop-blur-xl flex-col hidden md:flex">
        {sidebarContent}
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
           MAIN VIEW WRAPPER
         ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative min-w-0">
        
        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 flex flex-col min-w-0 relative">
          
          {/* Header Toolbar */}
          <header className="h-14 md:h-16 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-20 gap-2">
            
            {/* Mobile hamburger */}
            <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto no-scrollbar mask-fade-right flex-1 min-w-0">
              <button onClick={() => navigateToFolder(null)} className="text-slate-500 hover:text-[var(--peacock-teal)] font-medium flex-shrink-0 text-sm md:text-base">
                Home
              </button>
              {breadcrumb.map((crumb) => (
                <div key={crumb.id} className="flex items-center gap-1.5 flex-shrink-0">
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <button onClick={() => crumb.id !== 'search' && crumb.id !== 'starred' ? navigateToFolder(crumb.id) : null} className="text-slate-800 dark:text-slate-200 hover:text-[var(--peacock-teal)] font-medium max-w-[100px] md:max-w-[150px] truncate text-sm md:text-base">
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              {/* Mobile search toggle */}
              <button onClick={() => setMobileSearchOpen(!mobileSearchOpen)} className="sm:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <Search className="w-5 h-5" />
              </button>

              {/* Desktop Search */}
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search files & tags" 
                  className="pl-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 transition-all text-sm"
                />
              </div>

              {/* View Toggles */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
              
              {/* New Folder */}
              {activeTab === 'library' && !searchQuery && (
                <button onClick={() => setNewFolderOpen(true)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300 hidden sm:block" title="New Folder">
                  <FolderPlus className="w-5 h-5" />
                </button>
              )}
            </div>
          </header>

          {/* Mobile Search Bar (slides in below header) */}
          {mobileSearchOpen && (
            <div className="sm:hidden px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 animate-vg-fade-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search files & tags" 
                  className="pl-9 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-transparent text-sm"
                />
              </div>
            </div>
          )}

          {/* Multi-select ActionBar Overlay */}
          {selection.size > 0 && (
            <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 md:px-6 py-2.5 md:py-3 rounded-full shadow-2xl flex items-center gap-4 md:gap-6 animate-vg-slide-up border border-slate-700 dark:border-slate-200">
              <span className="font-bold text-sm">{selection.size} selected</span>
              <div className="w-px h-5 bg-slate-700 dark:bg-slate-300" />
              <div className="flex items-center gap-1">
                <button onClick={handleBulkDelete} className="p-2 rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors" aria-label="Delete selected">
                  <Trash2 className="w-4 h-4 text-red-400 dark:text-red-600" />
                </button>
                <button onClick={clearSelection} className="p-2 rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 text-slate-400 dark:text-slate-500 ml-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Upload Banner */}
          {uploadState.status !== 'idle' && (
            <div className="mx-4 md:mx-6 mt-4 rounded-2xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-md border animate-vg-fade-in z-10 relative bg-white/90 dark:bg-slate-800/90 backdrop-blur">
              {uploadState.status === 'error' ? <AlertCircle className="w-5 h-5 text-red-500 shrink-0" /> :
               uploadState.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" /> : 
               <Loader2 className="w-5 h-5 text-[var(--peacock-teal)] animate-spin shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{uploadState.status === 'uploading' ? `Uploading ${uploadState.filename} - ${uploadState.progress}%` : uploadState.status}</p>
                {uploadState.status === 'uploading' && (
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-[var(--peacock-teal)] h-full transition-all" style={{width: `${uploadState.progress}%`}} />
                  </div>
                )}
              </div>
              <button onClick={() => setUploadState({ status: 'idle', progress: 0, filename: '' })} className="p-1 hover:bg-black/5 rounded shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth" onClick={clearSelection}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 opacity-50">
                 <Loader2 className="w-10 h-10 animate-spin text-slate-400 mb-4" />
                 <p>Loading your space...</p>
              </div>
            ) : error ? (
              <div className="p-10 text-center text-red-500">{error}</div>
            ) : (folders.length === 0 && files.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center max-w-md mx-auto fade-in px-4">
                <FolderOpen className="w-16 h-16 md:w-20 md:h-20 mb-6 opacity-20" />
                <h3 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-300 mb-2">It's empty here</h3>
                <p className="mb-8 text-sm md:text-base">Upload files or create folders to organize your personal reading library.</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all active:scale-95 text-sm md:text-base"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              <div className={`gap-3 md:gap-6 ${viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'flex flex-col'}`}>
                
                {/* ── Render Folders ── */}
                {folders.map(folder => {
                  const sid = `folder:${folder.id}`;
                  const selected = isSelected(sid);
                  return (
                    <FolderCard 
                      key={folder.id}
                      folder={folder}
                      viewMode={viewMode}
                      selected={selected}
                      highlighted={infoPanelItem?.id === folder.id}
                      onNavigate={() => navigateToFolder(folder.id)}
                      onSelect={(e) => toggleSelection(e, sid)}
                      onInfo={() => setInfoPanelItem({ ...folder, type: 'folder' })}
                      onStar={(e) => handleToggleStar(e, folder.id, 'folder', folder.isStarred)}
                      onLongPress={(touch) => openContextMenu(folder.id, 'folder', touch)}
                    />
                  );
                })}

                {/* ── Render Files ── */}
                {files.map(file => {
                  const sid = `file:${file.id}`;
                  const selected = isSelected(sid);
                  return (
                    <FileCard 
                      key={file.id}
                      file={file}
                      viewMode={viewMode}
                      selected={selected}
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

          {/* ── Mobile FAB (upload + new folder) ── */}
          <div className="md:hidden fixed bottom-6 right-6 z-30 flex flex-col items-end gap-3">
            {activeTab === 'library' && !searchQuery && (
              <button 
                onClick={() => setNewFolderOpen(true)} 
                className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform"
              >
                <FolderPlus className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="w-14 h-14 rounded-full bg-gradient-to-r from-[var(--peacock-teal)] to-[var(--deep-saffron)] text-white shadow-xl flex items-center justify-center active:scale-90 transition-transform"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </main>

        {/* ══════════════════════════════════════════════════════════════════
             DESKTOP INFO PANEL (right sidebar, hidden on mobile)
           ══════════════════════════════════════════════════════════════════ */}
        {infoPanelItem && (
          <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex-col animate-vg-fade-in shadow-l hidden md:flex">
            <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-400" /> Details
              </h3>
              <button onClick={() => setInfoPanelItem(null)} className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            {infoPanelContent}
          </aside>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
           MOBILE BOTTOM SHEET (info panel on small screens)
         ══════════════════════════════════════════════════════════════════ */}
      {infoPanelItem && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setInfoPanelItem(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-vg-fade-in" />
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]"
            style={{ animation: 'slideUpSheet 0.3s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Info className="w-5 h-5 text-slate-400" /> Details
              </h3>
              <button onClick={() => setInfoPanelItem(null)} className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            {infoPanelContent}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           MOBILE CONTEXT MENU (long-press popup)
         ══════════════════════════════════════════════════════════════════ */}
      {contextMenuTarget && (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenuTarget(null)}>
          <div className="absolute inset-0" />
          <div 
            className="absolute bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 min-w-[180px]"
            style={{ 
              top: Math.min(contextMenuTarget.y, window.innerHeight - 280), 
              left: Math.min(contextMenuTarget.x - 90, window.innerWidth - 200),
              animation: 'scaleIn 0.15s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            <ContextMenuItem icon={<Info className="w-4 h-4" />} label="Details" onClick={() => {
              const item = [...files, ...folders as any[]].find(i => i.id === contextMenuTarget.id);
              if (item) {
                setInfoPanelItem({ ...item, type: contextMenuTarget.type });
              }
              setContextMenuTarget(null);
            }} />
            <ContextMenuItem icon={<Star className="w-4 h-4" />} label="Toggle Star" onClick={(e) => {
              const item = contextMenuTarget.type === 'file' 
                ? files.find(f => f.id === contextMenuTarget.id)
                : folders.find(f => f.id === contextMenuTarget.id);
              if (item) handleToggleStar(e as React.MouseEvent, item.id, contextMenuTarget.type, item.isStarred);
              setContextMenuTarget(null);
            }} />
            <ContextMenuItem icon={<Edit3 className="w-4 h-4" />} label="Rename" onClick={() => {
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
            <ContextMenuItem icon={<Check className="w-4 h-4" />} label="Select" onClick={() => {
              const prefix = contextMenuTarget.type === 'file' ? 'file:' : 'folder:';
              setSelection(prev => { const n = new Set(prev); n.add(prefix + contextMenuTarget.id); return n; });
              setContextMenuTarget(null);
            }} />
            <div className="mx-3 my-1 border-t border-slate-200 dark:border-slate-700" />
            <ContextMenuItem icon={<Trash2 className="w-4 h-4 text-red-500" />} label="Delete" danger onClick={() => {
              setDeleteConfirmId({ id: contextMenuTarget.id, type: contextMenuTarget.type });
              setContextMenuTarget(null);
            }} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
           DIALOGS
         ══════════════════════════════════════════════════════════════════ */}

      {/* New Folder */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <div className="pt-2">
            <Input autoFocus placeholder="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
          </div>
          <DialogFooter className="mt-4"><button onClick={handleCreateFolder} className="px-4 py-2 bg-[var(--peacock-teal)] text-white font-bold rounded-lg hover:bg-teal-700 active:scale-95 transition-transform">Create</button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Form */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename {editingItem?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {editingItem?.type === 'folder' ? (
              <Input value={editingItem.name || ''} onChange={e => editingItem && setEditingItem({...editingItem, name: e.target.value, type: 'folder'})} />
            ) : (
              <>
                <Input value={editingItem?.title || ''} onChange={e => editingItem && setEditingItem({...editingItem, title: e.target.value, type: 'file'})} placeholder="Title" />
                <Input value={editingItem?.author || ''} onChange={e => editingItem && setEditingItem({...editingItem, author: e.target.value, type: 'file'})} placeholder="Author" />
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
             <button onClick={handleSaveEdit} className="px-4 py-2 bg-[var(--peacock-teal)] text-white font-bold rounded-lg hover:bg-teal-700 active:scale-95 transition-transform">Save</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Item</DialogTitle>
            <DialogDescription>This action will permanently delete the {deleteConfirmId?.type} and all its contents if it is a folder.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
             <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 text-slate-600 font-semibold bg-slate-100 rounded-lg mr-2 hover:bg-slate-200 active:scale-95">Cancel</button>
             <button onClick={handleDeleteItem} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 active:scale-95">Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Inline CSS for mobile animations ── */}
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
      `}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Sub-Components
// ══════════════════════════════════════════════════════════════════════════════

function SidebarItem({ icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95
        ${active ? 'bg-white dark:bg-slate-800 text-[var(--peacock-teal)] shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
      `}
    >
      <div className={`${active ? 'opacity-100' : 'opacity-70'} transition-opacity`}>{icon}</div>
      {label}
    </button>
  );
}

function ContextMenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode, label: string, onClick: (e: React.MouseEvent) => void, danger?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors active:bg-slate-100 dark:active:bg-slate-700
        ${danger ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
      `}
    >
      {icon}
      {label}
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

  return (
    <div 
      key={folder.id}
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
      onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      onTouchCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      className={`
        group relative flex ${viewMode === 'grid' ? 'flex-col items-center p-4 md:p-6 text-center' : 'flex-row items-center p-3 md:p-4 text-left'}
        bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer transition-all duration-200 select-none
        ${selected ? 'border-[var(--peacock-teal)] ring-2 ring-[var(--peacock-teal)]/20 shadow-md bg-[var(--peacock-teal)]/5' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'}
        ${highlighted ? 'ring-2 ring-slate-300 dark:ring-slate-600' : ''}
      `}
    >
      <div className={`${viewMode === 'grid' ? 'w-12 h-12 md:w-16 md:h-16 mb-3 md:mb-4' : 'w-10 h-10 mr-3 md:mr-4'} shrink-0 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl flex items-center justify-center`}>
        <Folder className={`${viewMode === 'grid' ? 'w-6 h-6 md:w-8 md:h-8' : 'w-5 h-5'} fill-current opacity-80`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm md:text-base">{folder.name}</h4>
        {viewMode === 'list' && <p className="text-xs text-slate-500 mt-0.5">Folder • {new Date(folder.updatedAt).toLocaleDateString()}</p>}
      </div>

      {/* Quick actions (desktop hover-only) */}
      <div className={`absolute top-2 right-2 hidden md:flex ${viewMode === 'grid' ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
        <button onClick={(e) => { e.stopPropagation(); onInfo(); }} className="p-1.5 text-slate-400 hover:text-[var(--peacock-teal)]"><Info className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onStar(e); }} className="p-1.5 text-slate-400 hover:text-yellow-500">
           <Star className={`w-4 h-4 ${folder.isStarred ? 'fill-yellow-400 text-yellow-500' : ''}`} />
        </button>
      </div>

      {/* Star indicator (small, always visible on mobile if starred) */}
      {folder.isStarred && (
        <div className="md:hidden absolute top-2 right-2">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-500" />
        </div>
      )}

      {selected && (
        <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[var(--peacock-teal)] text-white w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center shadow-sm z-20">
           <Check className="w-3 h-3 md:w-4 md:h-4" />
        </div>
      )}
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

  return (
    <div 
      key={file.id}
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
      onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      onTouchCancel={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
      className={`
        group relative flex ${viewMode === 'grid' ? 'flex-col' : 'flex-row items-center'}
        bg-white dark:bg-slate-900 border rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 select-none
        ${selected ? 'border-[var(--peacock-teal)] ring-2 ring-[var(--peacock-teal)]/20 shadow-md ring-inset' : 'border-slate-200 dark:border-slate-800 md:hover:-translate-y-1 hover:shadow-xl'}
        ${highlighted ? 'ring-2 ring-slate-300 dark:ring-slate-600' : ''}
      `}
    >
      {/* Cover */}
      <div className={`${viewMode === 'grid' ? 'h-36 md:h-48' : 'w-14 h-14 md:w-16 md:h-16 shrink-0 m-2.5 md:m-3 rounded-lg'} bg-slate-50 dark:bg-slate-800 flex items-center justify-center relative overflow-hidden`}>
         {file.format === 'pdf' ? (
           <FileText className={`${viewMode === 'grid' ? 'w-12 h-12 md:w-16 md:h-16' : 'w-7 h-7 md:w-8 md:h-8'} text-red-400 opacity-80 group-hover:scale-110 transition-transform`} />
         ) : (
           <FileUp className={`${viewMode === 'grid' ? 'w-12 h-12 md:w-16 md:h-16' : 'w-7 h-7 md:w-8 md:h-8'} text-emerald-400 opacity-80 group-hover:scale-110 transition-transform`} />
         )}
         {viewMode === 'grid' && (
           <Badge className="absolute top-2 left-2 md:top-3 md:left-3 bg-white/90 dark:bg-slate-900/90 text-[10px] md:text-xs py-0 shadow-sm backdrop-blur border-0">
             {file.format.toUpperCase()}
           </Badge>
         )}
      </div>

      {/* Metadata */}
      <div className={`flex flex-col flex-1 min-w-0 ${viewMode === 'grid' ? 'p-3 md:p-4 border-t border-slate-100 dark:border-slate-800' : 'py-2.5 md:py-3 pr-3 md:pr-4'}`}>
        <h4 className="font-bold text-slate-800 dark:text-white truncate group-hover:text-[var(--peacock-teal)] transition-colors text-sm md:text-base">{file.title}</h4>
        <p className="text-[11px] md:text-xs text-slate-500 truncate mt-0.5">{file.author || 'Unknown author'}</p>
        
        {viewMode === 'grid' && (
          <div className="flex items-center justify-between mt-3 md:mt-4">
             <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 md:px-2 rounded-md py-0.5">{formatBytes(file.fileSize)}</span>
             <span className="text-[11px] md:text-xs font-semibold text-[var(--peacock-teal)]">{file.progress > 0 ? `${Math.round(file.progress * 100)}%` : 'New'}</span>
          </div>
        )}
        
        {viewMode === 'list' && (
           <div className="flex items-center gap-3 md:gap-4 mt-1">
             <span className="text-[11px] md:text-xs text-slate-400">{formatBytes(file.fileSize)}</span>
             <span className="text-[11px] md:text-xs text-slate-400">{file.format.toUpperCase()}</span>
             <span className="text-[11px] md:text-xs font-semibold text-[var(--peacock-teal)] ml-auto pr-6 md:pr-8">{file.progress > 0 ? `${Math.round(file.progress * 100)}%` : ''}</span>
           </div>
        )}
      </div>

      {/* Progress bar overlay (grid) */}
      {file.progress > 0 && viewMode === 'grid' && (
        <div className="absolute top-36 md:top-48 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 -mt-1 z-10">
           <div className="h-full bg-[var(--peacock-teal)]" style={{ width: `${Math.min(100, file.progress * 100)}%` }} />
        </div>
      )}

      {/* Desktop hover actions */}
      <div className={`absolute top-2 right-2 hidden md:flex bg-white/80 dark:bg-slate-900/80 backdrop-blur rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity ${viewMode === 'list' && 'top-1/2 -translate-y-1/2 shadow-none border-0 bg-transparent dark:bg-transparent mr-2'}`}>
        <button onClick={(e) => { e.stopPropagation(); onInfo(); }} className="p-1.5 text-slate-400 hover:text-[var(--peacock-teal)]"><Info className="w-4 h-4" /></button>
        <button onClick={(e) => { e.stopPropagation(); onStar(e); }} className="p-1.5 text-slate-400 hover:text-yellow-500">
           <Star className={`w-4 h-4 ${file.isStarred ? 'fill-yellow-400 text-yellow-500' : ''}`} />
        </button>
      </div>

      {/* Star indicator (mobile) */}
      {file.isStarred && (
        <div className="md:hidden absolute top-2 right-2">
          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-500" />
        </div>
      )}

      {selected && (
        <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[var(--peacock-teal)] text-white w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center shadow-sm z-20">
           <Check className="w-3 h-3 md:w-4 md:h-4" />
        </div>
      )}
    </div>
  );
}
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthSyncStore } from './useAuthStore';
import { fetchWithRetry } from '@/lib/utils/fetch-with-retry';

// Types for annotations
export type AnnotationType = 'highlight' | 'note' | 'bookmark' | 'ink';
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export interface HighlightArea {
  pageIndex: number;
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface Annotation {
  id: string;
  bookId: string;
  userId: string;
  userName: string;
  tenantId: string | null; // null for independent students, tenantId for institutional users
  pageNumber: number;
  createdAt: string;
  updatedAt: string;
  type: AnnotationType;
  color: AnnotationColor;
  content: string;
  selectedText: string;
  position: {
    startIndex: number;
    endIndex: number;
    highlightAreas?: HighlightArea[];
  };
  isShared: boolean;
  // For replies to notes
  parentId?: string;
  replies?: Annotation[];
  // For custom arbitrary data (e.g. ink traces)
  data?: any;
}

interface AnnotationState {
  // Collection of all annotations
  annotations: Annotation[];

  // Currently selected annotation
  selectedAnnotation: Annotation | null;

  // Filter states
  visibleTypes: AnnotationType[];
  filterByUser: string | null;
  sortBy: 'position' | 'date' | 'type';

  // UI states
  isAnnotationModalOpen: boolean;
  isAnnotationListOpen: boolean;

  // History states
  past: Annotation[][];
  future: Annotation[][];

  // Global Tool settings
  activeTool: 'text' | 'hand' | 'pen' | 'highlighter' | 'eraser';
  inkColor: string;
  inkWidth: number;

  // Actions
  undo: () => void;
  redo: () => void;
  addAnnotation: (annotation: Omit<Annotation, 'id' | 'userId' | 'userName' | 'tenantId' | 'createdAt' | 'updatedAt'>) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  addReply: (parentId: string, content: string) => void;

  // Filters
  toggleAnnotationType: (type: AnnotationType) => void;
  setFilterByUser: (userId: string | null) => void;
  setSortBy: (sortBy: 'position' | 'date' | 'type') => void;

  // Selection
  selectAnnotation: (id: string | null) => void;

  // Modal controls
  toggleAnnotationModal: () => void;
  toggleAnnotationList: () => void;

  // Tool controls
  setActiveTool: (tool: 'text' | 'hand' | 'pen' | 'highlighter' | 'eraser') => void;
  setInkColor: (color: string) => void;
  setInkWidth: (width: number) => void;

  // Book specific (tenant-scoped)
  getBookAnnotations: (bookId: string) => Annotation[];
  getPageAnnotations: (bookId: string, pageNumber: number) => Annotation[];

  // Sharing (within tenant context)
  toggleShareAnnotation: (id: string) => void;
  getSharedAnnotations: (bookId: string) => Annotation[];

  // Tenant management
  getCurrentTenantAnnotations: (bookId: string) => Annotation[];
  syncAnnotationsWithBackend: (bookId: string) => Promise<void>;
}

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// Initialize with some mock annotations for testing
const createMockAnnotations = (): Annotation[] => {
  const mockUser = {
    id: '1',
    name: 'Test User'
  };

  const now = new Date().toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: 'mock-1',
      bookId: 'book-1',
      userId: mockUser.id,
      userName: mockUser.name,
      tenantId: null, // Independent student annotation
      pageNumber: 1,
      createdAt: yesterday,
      updatedAt: yesterday,
      type: 'highlight',
      color: 'yellow',
      content: '',
      selectedText: 'Digital libraries represent one of the most significant advancements',
      position: {
        startIndex: 29,
        endIndex: 96
      },
      isShared: false
    },
    {
      id: 'mock-2',
      bookId: 'book-1',
      userId: mockUser.id,
      userName: mockUser.name,
      tenantId: null, // Independent student annotation
      pageNumber: 2,
      createdAt: now,
      updatedAt: now,
      type: 'note',
      color: 'green',
      content: 'Important definition of digital library components',
      selectedText: 'Digital library systems are complex technological ecosystems',
      position: {
        startIndex: 0,
        endIndex: 59
      },
      isShared: true
    }
  ];
};

export const useAnnotationStore = create<AnnotationState>()(
  persist(
    (set, get) => ({
      // Initial state
      annotations: createMockAnnotations(),
      selectedAnnotation: null,
      visibleTypes: ['highlight', 'note', 'ink'],
      filterByUser: null,
      sortBy: 'position',
      isAnnotationModalOpen: false,
      isAnnotationListOpen: false,
      past: [],
      future: [],
      activeTool: 'text',
      inkColor: '#3b82f6', // Default blue
      inkWidth: 3,

      // Actions
      undo: () => {
        const { past, future, annotations } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        
        // Compute diff to sync with backend
        const deleted = annotations.filter(c => !previous.find(p => p.id === c.id));
        const added = previous.filter(p => !annotations.find(c => c.id === p.id));
        const updated = previous.filter(p => {
          const c = annotations.find(c => c.id === p.id);
          return c && JSON.stringify(c) !== JSON.stringify(p);
        });

        set({
          past: newPast,
          future: [annotations, ...future],
          annotations: previous
        });

        // Sync with backend
        deleted.forEach(a => fetch(`/api/annotations/${a.id}`, { method: 'DELETE' }).catch(console.error));
        added.forEach(a => fetch('/api/annotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).catch(console.error));
        updated.forEach(a => fetch('/api/annotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).catch(console.error));
      },

      redo: () => {
        const { past, future, annotations } = get();
        if (future.length === 0) return;

        const next = future[0];
        const newFuture = future.slice(1);

        // Compute diff to sync with backend
        const deleted = annotations.filter(c => !next.find(n => n.id === c.id));
        const added = next.filter(n => !annotations.find(c => c.id === n.id));
        const updated = next.filter(n => {
          const c = annotations.find(c => c.id === n.id);
          return c && JSON.stringify(c) !== JSON.stringify(n);
        });

        set({
          past: [...past, annotations],
          future: newFuture,
          annotations: next
        });

        // Sync with backend
        deleted.forEach(a => fetch(`/api/annotations/${a.id}`, { method: 'DELETE' }).catch(console.error));
        added.forEach(a => fetch('/api/annotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).catch(console.error));
        updated.forEach(a => fetch('/api/annotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) }).catch(console.error));
      },

      addAnnotation: (annotationData) => {
        const user = useAuthSyncStore.getState().user;
        if (!user) return;

        // Determine tenantId based on user's account type and current context
        const currentTenantId = useAuthSyncStore.getState().currentTenantId;
        const tenantId = user.accountType === 'INDEPENDENT' ? null : currentTenantId;

        const now = new Date().toISOString();
        const newAnnotation: Annotation = {
          id: generateId(),
          userId: String(user.id),
          userName: user.name || 'User',
          tenantId,
          createdAt: now,
          updatedAt: now,
          ...annotationData,
        };

        // Check for duplicates (same position and text) and don't add if exists
        const isDuplicate = get().annotations.some(a =>
          a.bookId === newAnnotation.bookId &&
          a.pageNumber === newAnnotation.pageNumber &&
          a.type === newAnnotation.type &&
          a.selectedText === newAnnotation.selectedText &&
          a.tenantId === newAnnotation.tenantId // Also check tenant context
        );

        if (isDuplicate) {
          return;
        }

        const currentState = get().annotations;
        set((state) => ({
          past: [...state.past, currentState].slice(-50), // keep last 50
          future: [],
          annotations: [...state.annotations, newAnnotation],
          selectedAnnotation: newAnnotation
        }));

        // Fire & Forget sync
        fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAnnotation)
        }).catch(console.error);
      },

      updateAnnotation: (id, updates) => {
        const currentState = get().annotations;
        set((state) => ({
          past: [...state.past, currentState].slice(-50),
          future: [],
          annotations: state.annotations.map(annotation =>
            annotation.id === id
              ? {
                ...annotation,
                ...updates,
                updatedAt: new Date().toISOString()
              }
              : annotation
          ),
          // Update selected annotation if it's the one being updated
          selectedAnnotation: state.selectedAnnotation?.id === id
            ? { ...state.selectedAnnotation, ...updates, updatedAt: new Date().toISOString() }
            : state.selectedAnnotation
        }));

        // Background sync
        const state = get();
        const updatedAnn = state.annotations.find(a => a.id === id);
        if (updatedAnn) {
          fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedAnn)
          }).catch(console.error);
        }
      },

      deleteAnnotation: (id) => {
        const currentState = get().annotations;
        // Also delete any replies to this annotation
        set((state) => {
          // Get all IDs to delete (the annotation and its replies)
          const idsToDelete = new Set([id]);
          state.annotations.forEach(a => {
            if (a.parentId === id) {
              idsToDelete.add(a.id);
            }
          });

          return {
            past: [...state.past, currentState].slice(-50),
            future: [],
            annotations: state.annotations.filter(a => !idsToDelete.has(a.id)),
            selectedAnnotation: state.selectedAnnotation?.id === id ? null : state.selectedAnnotation
          };
        });

        fetch(`/api/annotations/${id}`, {
          method: 'DELETE',
        }).catch(console.error);
      },

      addReply: (parentId, content) => {
        const user = useAuthSyncStore.getState().user;
        if (!user) return;

        const parent = get().annotations.find(a => a.id === parentId);
        if (!parent) return;

        const now = new Date().toISOString();
        const reply: Annotation = {
          id: generateId(),
          bookId: parent.bookId,
          userId: String(user.id),
          userName: user.name || 'User',
          tenantId: parent.tenantId, // Inherit tenant context from parent
          pageNumber: parent.pageNumber,
          createdAt: now,
          updatedAt: now,
          type: 'note',
          color: parent.color,
          content,
          selectedText: '',
          position: parent.position,
          isShared: parent.isShared,
          parentId
        };

        const currentState = get().annotations;
        set((state) => ({
          past: [...state.past, currentState].slice(-50),
          future: [],
          annotations: [...state.annotations, reply]
        }));

        fetchWithRetry(`${process.env.NEXT_PUBLIC_API_URL}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(reply)
        }).catch(console.error);
      },

      // Filters
      toggleAnnotationType: (type) => {
        set((state) => {
          // If this type is already visible, remove it
          if (state.visibleTypes.includes(type)) {
            // Don't allow all types to be hidden
            if (state.visibleTypes.length === 1) {
              return state;
            }
            return {
              visibleTypes: state.visibleTypes.filter(t => t !== type)
            };
          }
          // Otherwise add this type
          return {
            visibleTypes: [...state.visibleTypes, type]
          };
        });
      },

      setFilterByUser: (userId) => {
        set({ filterByUser: userId });
      },

      setSortBy: (sortBy) => {
        set({ sortBy });
      },

      // Selection
      selectAnnotation: (id) => {
        if (id === null) {
          set({ selectedAnnotation: null });
          return;
        }

        const annotation = get().annotations.find(a => a.id === id) || null;
        set({ selectedAnnotation: annotation });
      },

      // Modal controls
      toggleAnnotationModal: () => {
        set((state) => ({ isAnnotationModalOpen: !state.isAnnotationModalOpen }));
      },

      toggleAnnotationList: () => {
        set((state) => ({ isAnnotationListOpen: !state.isAnnotationListOpen }));
      },
      
      // Tool controls
      setActiveTool: (tool) => set({ activeTool: tool }),
      setInkColor: (color) => set({ inkColor: color }),
      setInkWidth: (width) => set({ inkWidth: width }),

      // Book specific methods
      getBookAnnotations: (bookId) => {
        // Get all primary annotations (not replies) for this book
        return get().annotations.filter(a =>
          a.bookId === bookId && !a.parentId
        ).map(annotation => {
          // Add replies to parent annotations
          const replies = get().annotations.filter(a => a.parentId === annotation.id);
          return {
            ...annotation,
            replies: replies.length > 0 ? replies : undefined
          };
        });
      },

      getPageAnnotations: (bookId, pageNumber) => {
        // Get all primary annotations (not replies) for this book and page
        return get().annotations.filter(a =>
          a.bookId === bookId &&
          a.pageNumber === pageNumber &&
          !a.parentId
        ).map(annotation => {
          // Add replies to parent annotations
          const replies = get().annotations.filter(a => a.parentId === annotation.id);
          return {
            ...annotation,
            replies: replies.length > 0 ? replies : undefined
          };
        });
      },

      // Sharing
      toggleShareAnnotation: (id) => {
        let updatedAnnotation: Annotation | null = null;
        set((state) => ({
          annotations: state.annotations.map(a => {
            if (a.id === id) {
              updatedAnnotation = { ...a, isShared: !a.isShared, updatedAt: new Date().toISOString() };
              return updatedAnnotation;
            }
            return a;
          })
        }));

        if (updatedAnnotation) {
          fetch('/api/annotations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedAnnotation)
          }).catch(console.error);
        }
      },

      getSharedAnnotations: (bookId) => {
        const user = useAuthSyncStore.getState().user;
        const currentTenantId = useAuthSyncStore.getState().currentTenantId;

        // For independent students, show only their own shared annotations
        if (user?.accountType === 'INDEPENDENT') {
          return get().annotations.filter(a =>
            a.bookId === bookId &&
            a.isShared &&
            a.tenantId === null
          );
        }

        // For institutional users, show shared annotations within their tenant
        return get().annotations.filter(a =>
          a.bookId === bookId &&
          a.isShared &&
          a.tenantId === currentTenantId
        );
      },

      // Get annotations for current tenant context
      getCurrentTenantAnnotations: (bookId) => {
        const user = useAuthSyncStore.getState().user;
        const currentTenantId = useAuthSyncStore.getState().currentTenantId;

        // For independent students, show only their own annotations
        if (user?.accountType === 'INDEPENDENT') {
          return get().annotations.filter(a =>
            a.bookId === bookId &&
            a.tenantId === null &&
            a.userId === user.id
          );
        }

        // For institutional users, show annotations within their tenant
        return get().annotations.filter(a =>
          a.bookId === bookId &&
          a.tenantId === currentTenantId
        );
      },

      // Sync annotations with backend
      syncAnnotationsWithBackend: async (bookId: string) => {
        try {
          const res = await fetch(`/api/annotations?bookId=${bookId}`);
          const serverAnnotations = await res.json();
          if (Array.isArray(serverAnnotations)) {
            set((state) => {
              // Map server representation to client format
              const formattedServerAnns: Annotation[] = serverAnnotations.map(a => ({
                id: a.id,
                bookId: a.bookId,
                userId: a.userId,
                userName: a.user?.name || 'User',
                tenantId: a.tenantId,
                pageNumber: a.position?.pageIndex || 1, // fallback
                createdAt: a.createdAt,
                updatedAt: a.updatedAt,
                type: a.type as AnnotationType,
                color: (a.color || 'yellow') as AnnotationColor,
                content: a.content || '',
                selectedText: '', // Server doesn't store extracted string exactly, handled natively by position mapping
                position: a.position,
                isShared: a.shared || a.isShared || false,
                // Ink strokes (and any other per-type payload) live here, not
                // in `position` — omitting this previously meant the
                // server-fetched copy always won the merge below with no
                // strokes, wiping every freehand drawing on next sync.
                data: a.data,
              }));

              // Merge logic: prefer server for same IDs, but keep pure-local ones not yet pushed
              const existingIds = new Set(formattedServerAnns.map(a => a.id));
              const localOnly = state.annotations.filter(a => a.bookId === bookId && !existingIds.has(a.id));
              const otherBooks = state.annotations.filter(a => a.bookId !== bookId);

              return {
                annotations: [...otherBooks, ...localOnly, ...formattedServerAnns]
              };
            });
          }
        } catch (e) {
          console.error("Failed to sync annotations:", e);
        }
      },
    }),
    {
      name: 'annotation-storage',
      partialize: (state) => ({
        annotations: state.annotations,
        visibleTypes: state.visibleTypes,
      }),
    }
  )
);
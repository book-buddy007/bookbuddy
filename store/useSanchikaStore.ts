import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SanchikaNote {
  id: string;
  bookId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface SanchikaState {
  notes: SanchikaNote[];
  isOpen: boolean;
  
  // Actions
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  
  addNote: (bookId: string, content: string, citation?: string) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  
  // Gets all notes for a specific book
  getBookNotes: (bookId: string) => SanchikaNote[];
}

const generateId = () => Math.random().toString(36).substring(2, 11);

export const useSanchikaStore = create<SanchikaState>()(
  persist(
    (set, get) => ({
      notes: [],
      isOpen: false,

      toggleSidebar: () => set((state) => ({ isOpen: !state.isOpen })),
      openSidebar: () => set({ isOpen: true }),
      closeSidebar: () => set({ isOpen: false }),

      addNote: (bookId, content, citation) => {
        const now = new Date().toISOString();
        const fullContent = citation ? `${content}\n\n*Source: ${citation}*` : content;
        
        const newNote: SanchikaNote = {
          id: generateId(),
          bookId,
          content: fullContent,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          notes: [newNote, ...state.notes]
        }));
        
        // Auto-open sidebar when sending a note
        set({ isOpen: true });
      },

      updateNote: (id, content) => {
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id
              ? { ...note, content, updatedAt: new Date().toISOString() }
              : note
          )
        }));
      },

      deleteNote: (id) => {
        set((state) => ({
          notes: state.notes.filter((note) => note.id !== id)
        }));
      },

      getBookNotes: (bookId) => {
        return get().notes.filter((n) => n.bookId === bookId);
      }
    }),
    {
      // Renamed (was 'sanchika-storage') and versioned after the 2026-08-05
      // content reset: server-side bookIds were reissued, so any client still
      // holding notes under the old key/version would resurface notes pointing
      // at bookIds that no longer exist. migrate() below discards rather than
      // attempts to carry old data forward across the reset boundary.
      name: 'sanchika-storage-v2',
      version: 1,
      migrate: () => ({ notes: [], isOpen: false }),
      partialize: (state) => ({
        notes: state.notes
      }),
    }
  )
);

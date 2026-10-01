import { create } from 'zustand';

interface DictionaryState {
    isOpen: boolean;
    word: string;
    contextSentence: string | null;
    bookId: string | null;
    openDictionary: (word: string, contextSentence?: string, bookId?: string) => void;
    closeDictionary: () => void;
}

export const useDictionaryStore = create<DictionaryState>((set) => ({
    isOpen: false,
    word: '',
    contextSentence: null,
    bookId: null,
    
    openDictionary: (word, contextSentence = undefined, bookId = undefined) => set({ 
        isOpen: true, 
        word, 
        contextSentence: contextSentence ?? null,
        bookId: bookId ?? null
    }),
    
    closeDictionary: () => set({ 
        isOpen: false, 
        word: '', 
        contextSentence: null,
        bookId: null
    }),
}));

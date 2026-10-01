import { useState, useEffect } from 'react';
import { BookmarkType } from '@/types/audiobook';

const STORAGE_KEY_PREFIX = 'audiobook_bookmarks_';

export function useBookmarks(bookId: string) {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>(() => {
    if (typeof window !== 'undefined') {
      const savedBookmarks = localStorage.getItem(`${STORAGE_KEY_PREFIX}${bookId}`);
      if (savedBookmarks) {
        try {
          return JSON.parse(savedBookmarks);
        } catch (error) {
          console.error('Failed to parse saved bookmarks:', error);
        }
      }
    }
    return [];
  });

  // Save bookmarks to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${bookId}`, JSON.stringify(bookmarks));
    }
  }, [bookmarks, bookId]);

  const addBookmark = (time: number, note: string, chapter: string) => {
    const newBookmark: BookmarkType = {
      id: Date.now().toString(),
      time,
      note,
      chapter,
      createdAt: new Date().toISOString(),
    };
    setBookmarks(prev => [...prev, newBookmark]);
  };

  const removeBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  };

  const updateBookmark = (id: string, updates: Partial<BookmarkType>) => {
    setBookmarks(prev =>
      prev.map(bookmark =>
        bookmark.id === id ? { ...bookmark, ...updates } : bookmark
      )
    );
  };

  const getBookmarkAtTime = (time: number, tolerance: number = 5) => {
    return bookmarks.find(
      bookmark => Math.abs(bookmark.time - time) <= tolerance
    );
  };

  const getBookmarksInChapter = (chapter: string) => {
    return bookmarks.filter(bookmark => bookmark.chapter === chapter);
  };

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    updateBookmark,
    getBookmarkAtTime,
    getBookmarksInChapter,
  };
} 
import { useState, useEffect } from 'react';
import { PlayerState, Chapter } from '@/types/audiobook';

const STORAGE_KEY = 'audiobook_player_state';

interface StoredState {
  currentTime: number;
  volume: number;
  isMuted: boolean;
  playbackSpeed: number;
  lastPlayedChapter: string;
  lastPlayedBook: string;
  lastPlayedAt: string;
}

export function useAudioState(bookId: string, initialState: PlayerState, chapters: Chapter[]) {
  const [state, setState] = useState<PlayerState>(() => {
    // Try to load saved state from localStorage
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsedState = JSON.parse(savedState) as StoredState;
          // Only restore if it's for the same book
          if (parsedState.lastPlayedBook === bookId) {
            return {
              ...initialState,
              currentTime: parsedState.currentTime,
              volume: parsedState.volume,
              isMuted: parsedState.isMuted,
              playbackSpeed: parsedState.playbackSpeed as any,
              activeChapter: chapters.find(
                (ch: Chapter) => ch.id === parsedState.lastPlayedChapter
              ) || chapters[0],
            };
          }
        } catch (error) {
          console.error('Failed to parse saved state:', error);
        }
      }
    }
    return initialState;
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stateToSave: StoredState = {
        currentTime: state.currentTime,
        volume: state.volume,
        isMuted: state.isMuted,
        playbackSpeed: state.playbackSpeed,
        lastPlayedChapter: state.activeChapter?.id || '',
        lastPlayedBook: bookId,
        lastPlayedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [state, bookId]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.isPlaying) {
        const stateToSave: StoredState = {
          currentTime: state.currentTime,
          volume: state.volume,
          isMuted: state.isMuted,
          playbackSpeed: state.playbackSpeed,
          lastPlayedChapter: state.activeChapter?.id || '',
          lastPlayedBook: bookId,
          lastPlayedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [state, bookId]);

  return [state, setState] as const;
} 
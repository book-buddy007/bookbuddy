import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────
export type AudioGender = 'MALE' | 'FEMALE';
export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface AudioTrack {
  id: string;
  sectionId: string;
  gender: AudioGender;
  fileUrl: string;
  durationSeconds: number;
  fileSizeBytes?: number;
}

export interface AudioSection {
  id: string;
  chapterId: string;
  title: string;
  sortOrder: number;
  sectionType: 'INTRO' | 'SECTION';
  transcriptUrl?: string | null;
  transcriptCues?: { paragraphIndex: number; startSeconds: number }[] | null;
  durationSeconds?: number | null;
  fileSizeBytes?: number | null;
  tracks: AudioTrack[];
}

export interface AudioChapter {
  id: string;
  bookId: string;
  title: string;
  sortOrder: number;
  sections: AudioSection[];
}

export interface AudioBookFormat {
  totalDurationSeconds?: number | null;
  totalSections?: number | null;
}

// §5 cross-media sync — mirrors backend/src/audiobook/word-align.util.ts's
// AlignedWord exactly (word, textOffset into the reference transcript,
// startMs/endMs into this specific track's audio).
export interface AlignedWord {
  word: string;
  textOffset: number;
  startMs: number;
  endMs: number;
}

// ─── Store State ────────────────────────────────────────────
interface AudioPlayerState {
  // Player identity
  bookId: string | null;
  bookTitle: string;
  bookAuthor: string;
  coverUrl: string;

  // Structure
  chapters: AudioChapter[];
  format: AudioBookFormat | null;

  // Current playback
  currentSectionId: string | null;
  positionSeconds: number;
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;

  // Preferences (persisted)
  activeGender: AudioGender;
  playbackRate: PlaybackSpeed;
  volume: number;
  isMuted: boolean;
  showTranscript: boolean;

  // Transcript
  transcriptText: string | null;
  transcriptCues: { paragraphIndex: number; startSeconds: number }[] | null;

  // §5 word-level alignment for the current section+gender track. Null
  // means "not fetched / not available for this track" — distinct from an
  // empty array, so the UI can tell "still loading or unsupported" apart
  // from "loaded, but the track genuinely has zero words" (shouldn't
  // happen, but null-vs-[] is cheap to keep unambiguous).
  alignedWords: AlignedWord[] | null;

  // Sleep timer
  sleepTimerMinutes: number | null;
  sleepTimerRemaining: number | null;
  /* Audit fix 15. The sleep menu offered 15/30/45/60/90 minutes and not
     the one people actually reach for — "stop when this section ends".
     A countdown cannot express it, because the answer depends on where
     playback is, so it is a separate flag rather than another preset. */
  sleepAtSectionEnd: boolean;

  // UI panels
  isChapterDrawerOpen: boolean;
  isTocOpen: boolean;

  // Presigned URL cache: sectionId:gender → url
  urlCache: Record<string, string>;

  // Error
  error: string | null;

  // ── Actions ──
  loadBook: (
    bookId: string,
    title: string,
    author: string,
    coverUrl: string,
    chapters: AudioChapter[],
    format: AudioBookFormat | null
  ) => void;

  setCurrentSection: (sectionId: string) => void;
  setPosition: (seconds: number) => void;
  setPlaying: (playing: boolean) => void;
  setLoading: (loading: boolean) => void;
  setBuffering: (buffering: boolean) => void;

  toggleGender: () => void;
  setPlaybackRate: (rate: PlaybackSpeed) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleTranscript: () => void;

  setTranscriptText: (text: string | null) => void;
  setTranscriptCues: (cues: { paragraphIndex: number; startSeconds: number }[] | null) => void;
  setAlignedWords: (words: AlignedWord[] | null) => void;

  setSleepTimer: (minutes: number | null) => void;
  setSleepAtSectionEnd: (enabled: boolean) => void;
  tickSleepTimer: () => boolean; // returns true if timer expired

  toggleChapterDrawer: () => void;
  cacheUrl: (key: string, url: string) => void;
  getCachedUrl: (sectionId: string, gender: AudioGender) => string | undefined;

  setError: (error: string | null) => void;

  // ── Computed helpers ──
  getCurrentSection: () => AudioSection | null;
  getCurrentChapter: () => AudioChapter | null;
  getNextSection: () => AudioSection | null;
  getPrevSection: () => AudioSection | null;
  getAllSectionsFlat: () => AudioSection[];
  getOverallProgress: () => number; // 0-100
  /** Index into alignedWords whose [startMs,endMs) contains the current
   * playback position, or -1 if alignment isn't loaded or no word matches
   * (e.g. a silence gap). */
  getCurrentWordIndex: () => number;
}

// ─── Store ──────────────────────────────────────────────────
export const useAudioPlayerStore = create<AudioPlayerState>()(
  persist(
    (set, get) => ({
      // Identity
      bookId: null,
      bookTitle: '',
      bookAuthor: '',
      coverUrl: '',

      // Structure
      chapters: [],
      format: null,

      // Current
      currentSectionId: null,
      positionSeconds: 0,
      isPlaying: false,
      isLoading: false,
      isBuffering: false,

      // Preferences
      activeGender: 'MALE',
      playbackRate: 1,
      volume: 1,
      isMuted: false,
      showTranscript: true,

      // Transcript
      transcriptText: null,
      transcriptCues: null,
      alignedWords: null,

      // Sleep
      sleepTimerMinutes: null,
      sleepTimerRemaining: null,
      sleepAtSectionEnd: false,

      // UI
      isChapterDrawerOpen: false,
      isTocOpen: false,

      // Cache
      urlCache: {},

      // Error
      error: null,

      // ── Actions ──
      loadBook: (bookId, title, author, coverUrl, chapters, format) => {
        const allSections = chapters.flatMap(c => c.sections);
        const firstSection = allSections[0] || null;
        set({
          bookId,
          bookTitle: title,
          bookAuthor: author,
          coverUrl,
          chapters,
          format,
          currentSectionId: firstSection?.id || null,
          positionSeconds: 0,
          isPlaying: false,
          isLoading: false,
          error: null,
          transcriptText: null,
          transcriptCues: null,
          alignedWords: null,
          urlCache: {},
        });
      },

      setCurrentSection: (sectionId) => set({ currentSectionId: sectionId, positionSeconds: 0, alignedWords: null }),
      setPosition: (seconds) => set({ positionSeconds: seconds }),
      setPlaying: (playing) => set({ isPlaying: playing }),
      setLoading: (loading) => set({ isLoading: loading }),
      setBuffering: (buffering) => set({ isBuffering: buffering }),

      toggleGender: () => set((s) => ({
        activeGender: s.activeGender === 'MALE' ? 'FEMALE' : 'MALE',
        alignedWords: null, // different gender = a different track's alignment
      })),
      setPlaybackRate: (rate) => set({ playbackRate: rate }),
      setVolume: (vol) => set({ volume: vol, isMuted: vol === 0 }),
      toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
      toggleTranscript: () => set((s) => ({ showTranscript: !s.showTranscript })),

      setTranscriptText: (text) => set({ transcriptText: text }),
      setTranscriptCues: (cues) => set({ transcriptCues: cues }),
      setAlignedWords: (words) => set({ alignedWords: words }),

      /* The two sleep modes are mutually exclusive — picking a duration
         clears "end of section" and vice versa, so the menu can never
         show two things armed at once. */
      setSleepTimer: (minutes) => set({
        sleepTimerMinutes: minutes,
        sleepTimerRemaining: minutes ? minutes * 60 : null,
        sleepAtSectionEnd: false,
      }),
      setSleepAtSectionEnd: (enabled) => set({
        sleepAtSectionEnd: enabled,
        ...(enabled ? { sleepTimerMinutes: null, sleepTimerRemaining: null } : {}),
      }),
      tickSleepTimer: () => {
        const remaining = get().sleepTimerRemaining;
        if (remaining === null) return false;
        const next = remaining - 1;
        if (next <= 0) {
          set({ sleepTimerMinutes: null, sleepTimerRemaining: null, isPlaying: false });
          return true;
        }
        set({ sleepTimerRemaining: next });
        return false;
      },

      toggleChapterDrawer: () => set((s) => ({ isChapterDrawerOpen: !s.isChapterDrawerOpen })),

      cacheUrl: (key, url) => set((s) => ({
        urlCache: { ...s.urlCache, [key]: url },
      })),
      getCachedUrl: (sectionId, gender) => {
        return get().urlCache[`${sectionId}:${gender}`];
      },

      setError: (error) => set({ error }),

      // ── Computed ──
      getCurrentSection: () => {
        const { chapters, currentSectionId } = get();
        for (const ch of chapters) {
          const sec = ch.sections.find(s => s.id === currentSectionId);
          if (sec) return sec;
        }
        return null;
      },
      getCurrentChapter: () => {
        const { chapters, currentSectionId } = get();
        for (const ch of chapters) {
          if (ch.sections.some(s => s.id === currentSectionId)) return ch;
        }
        return null;
      },
      getNextSection: () => {
        const all = get().getAllSectionsFlat();
        const idx = all.findIndex(s => s.id === get().currentSectionId);
        return idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
      },
      getPrevSection: () => {
        const all = get().getAllSectionsFlat();
        const idx = all.findIndex(s => s.id === get().currentSectionId);
        return idx > 0 ? all[idx - 1] : null;
      },
      getAllSectionsFlat: () => {
        return get().chapters.flatMap(c => c.sections);
      },
      getOverallProgress: () => {
        const { chapters, currentSectionId, positionSeconds } = get();
        const all = chapters.flatMap(c => c.sections);
        if (all.length === 0) return 0;
        const idx = all.findIndex(s => s.id === currentSectionId);
        if (idx < 0) return 0;

        let totalDuration = 0;
        let elapsed = 0;
        for (let i = 0; i < all.length; i++) {
          const dur = all[i].durationSeconds || 0;
          totalDuration += dur;
          if (i < idx) elapsed += dur;
          else if (i === idx) elapsed += Math.min(positionSeconds, dur);
        }
        return totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
      },

      getCurrentWordIndex: () => {
        const { alignedWords, positionSeconds } = get();
        if (!alignedWords || alignedWords.length === 0) return -1;
        const posMs = positionSeconds * 1000;
        // Binary search — sections can run to thousands of words, and this
        // is called on every timeupdate tick (a few times a second).
        let lo = 0;
        let hi = alignedWords.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const w = alignedWords[mid];
          if (posMs < w.startMs) hi = mid - 1;
          else if (posMs >= w.endMs) lo = mid + 1;
          else return mid;
        }
        return -1; // between words (silence gap) — no word "current" right now
      },
    }),
    {
      name: 'audio-player-storage',
      partialize: (state) => ({
        // Only persist user preferences, NOT playback state
        activeGender: state.activeGender,
        playbackRate: state.playbackRate,
        volume: state.volume,
        isMuted: state.isMuted,
        showTranscript: state.showTranscript,
      }),
    }
  )
);

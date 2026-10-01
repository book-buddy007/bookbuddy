'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/ui/icon';
import { useAudioPlayerStore, AudioGender, PlaybackSpeed, AudioSection } from '@/store/useAudioPlayerStore';
import { AudioWaveform } from '@/components/player/AudioWaveform';
import { useCoverColor } from '@/components/player/use-cover-color';
import { Slider } from '@/components/ui/slider';
import apiClient from '@/lib/apiClient';
import { getSharedAudio, sectionKey } from '@/lib/audio-engine';
import styles from './playerV2.module.css';

// ─── Constants ─────────────────────────────────────────────
const PLAYBACK_SPEEDS: PlaybackSpeed[] = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEP_PRESETS = [15, 30, 45, 60, 90];

// Audit fix 11. The header used to carry two colour-coded buttons —
// "Male" in blue, "Female" in pink. It is a narrator choice, but sat in
// the header worded as though it were a setting about the student, and
// the colour coding put a gender cue in a school product that had no
// reason to be there. It also ate most of a phone header, pushing the
// book title into an ellipsis.
//
// The underlying API still keys voices by MALE/FEMALE (`?gender=` on the
// presign and alignment endpoints), so the wire format is unchanged and
// this map is purely how the choice is *presented*.
const NARRATORS: Record<AudioGender, string> = {
  MALE: 'Aarav',
  FEMALE: 'Meera',
};

// ─── Helpers ───────────────────────────────────────────────
function getInitialTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('player-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function fmt(s: number): string {
  const secs = Math.max(0, Math.floor(s));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const sec = secs % 60;
  return h > 0
    ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    : `${m}:${sec.toString().padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AudiobookPlayerV2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId') || searchParams.get('id');

  // ── Refs ──
  // The app-wide audio element (lib/audio-engine): playback outlives this page, so the
  // player can be minimised into the mini player and keep going.
  const audioRef = useRef<HTMLAudioElement | null>(getSharedAudio());
  const transcriptScrollerRef = useRef<HTMLDivElement | null>(null);

  // ── Theme ──
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => { setTheme(getInitialTheme()); }, []);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('player-theme', next);
  };

  // ── Zustand Store ──
  const store = useAudioPlayerStore();
  const {
    chapters, currentSectionId, positionSeconds, isPlaying, isLoading,
    activeGender, playbackRate, volume, isMuted, showTranscript,
    transcriptText, sleepTimerRemaining, alignedWords,
    error, isChapterDrawerOpen, bookTitle, bookAuthor, coverUrl,
    sleepAtSectionEnd,
  } = store;

  // §5 — recomputed on every render, which happens on every timeupdate tick
  // (store.setPosition below) whenever the transcript panel is open; the
  // binary search in getCurrentWordIndex keeps this cheap even for long sections.
  const currentWordIndex = store.getCurrentWordIndex();

  // ── Local UI State ──
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showNarratorMenu, setShowNarratorMenu] = useState(false);

  /* Audit fix 14. Auto-advance used to swap the track silently: audio
     stopped, different audio started, and nothing said why. This holds
     the title of whatever just started for two seconds, and doubles as
     the text of an aria-live region so a screen reader is told the same
     thing sighted users are. */
  const [nowPlayingStrip, setNowPlayingStrip] = useState<string | null>(null);

  /* Audit fix 15. Which chapters the student has taken offline. Kept in
     component state, not the store: it is a property of this device, and
     the store is what syncs to the server. */
  const [downloadedChapters, setDownloadedChapters] = useState<Set<string>>(new Set());
  const [downloadingChapter, setDownloadingChapter] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const [openChapterIds, setOpenChapterIds] = useState<string[]>([]);
  const [sectionDuration, setSectionDuration] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  // ── Computed ──
  const currentSection = store.getCurrentSection();
  const currentChapter = store.getCurrentChapter();
  const nextSection = store.getNextSection();
  const prevSection = store.getPrevSection();

  /* Audit fix 12. The three progress indicators the player used to show
     were all scoped to the current section, so none of them could say
     which section this is or how much of the chapter is left. These are
     the two facts the sentence above the scrubber needs.

     `sectionOrdinal` is 1-based and 0 when the section cannot be located
     in its chapter, which the JSX treats as "do not claim a position". */
  const sectionsInChapter = currentChapter?.sections.length ?? 0;
  const sectionOrdinal = currentChapter && currentSectionId
    ? currentChapter.sections.findIndex(sec => sec.id === currentSectionId) + 1
    : 0;

  /* Minutes left in the chapter: what remains of this section plus every
     section after it. Returns null rather than 0 when durations are
     missing, so the line omits the claim instead of asserting "0 min
     left" on a chapter that has barely started. */
  const chapterMinutesLeft = (() => {
    if (!currentChapter || sectionOrdinal < 1) return null;
    const remainingHere = sectionDuration > 0
      ? Math.max(0, sectionDuration - positionSeconds)
      : (currentSection?.durationSeconds ?? 0);
    const later = currentChapter.sections
      .slice(sectionOrdinal)
      .reduce((sum, sec) => sum + (sec.durationSeconds ?? 0), 0);
    const total = remainingHere + later;
    if (total <= 0) return null;
    return Math.max(1, Math.round(total / 60));
  })();

  // ═══════════════════════════════════════════════════════════
  // INITIALIZATION: Fetch book structure
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!bookId) {
      /* Reaching the player with no book is a normal thing to do — the
         sidebar's "Audiobook Player" link has no book in it — so it is
         not an error, it is an empty state with somewhere to go. It used
         to say "No audiobook ID provided", which reads as a bug report
         written for the developer rather than a next step for the
         student. (Before audit fix 8 this link opened v1, which papered
         over the same gap by playing a mock Great Gatsby.) */
      store.setError('Pick an audiobook from the library to start listening.');
      return;
    }

    /* Re-entering from the mini player: this book is already loaded and may be
       playing, so keep its section and position instead of reloading from the top. */
    const loaded = useAudioPlayerStore.getState();
    if (loaded.bookId === bookId && loaded.chapters.length > 0) {
      const ch = loaded.getCurrentChapter() ?? loaded.chapters[0];
      if (ch) setOpenChapterIds([ch.id]);
      setIsInitialized(true);
      return;
    }

    const fetchStructure = async () => {
      store.setLoading(true);
      try {
        // 1. Fetch book metadata
        const bookRes = await apiClient.get(`/books/${bookId}`);
        const book = bookRes.data;

        // 2. Fetch audiobook structure
        const structRes = await apiClient.get(`/audiobooks/${bookId}/structure`);
        const { chapters: chs, format } = structRes.data;

        store.loadBook(
          bookId,
          book.title || 'Unknown Title',
          book.author || 'Unknown Author',
          book.coverUrl || '/placeholder-cover.jpg',
          chs,
          format
        );

        // Auto-expand first chapter
        if (chs.length > 0) {
          setOpenChapterIds([chs[0].id]);
        }
        setIsInitialized(true);
      } catch (err: any) {
        console.error('Failed to fetch audiobook structure:', err);
        store.setError(err?.response?.data?.message || 'Failed to load audiobook.');
      } finally {
        store.setLoading(false);
      }
    };

    fetchStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // ═══════════════════════════════════════════════════════════
  // PRESIGNED URL: Fetch audio URL for current section+gender
  // ═══════════════════════════════════════════════════════════
  const fetchAudioUrl = useCallback(async (sectionId: string, gender: AudioGender) => {
    const cached = store.getCachedUrl(sectionId, gender);
    if (cached) return cached;

    setIsFetchingUrl(true);
    try {
      const res = await apiClient.get(`/audiobooks/sections/${sectionId}/presign?gender=${gender}`);
      const url = res.data.url;
      store.cacheUrl(`${sectionId}:${gender}`, url);
      return url;
    } catch (err: any) {
      console.error('Failed to get presigned URL:', err);
      store.setError('Failed to load audio. Please try again.');
      return null;
    } finally {
      setIsFetchingUrl(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  // LOAD AUDIO: When section or gender changes, load the correct track
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isInitialized || !currentSectionId) return;

    const loadAudio = async () => {
      if (!audioRef.current) return;

      // Already loaded (the player was minimised and reopened): don't restart it.
      const key = sectionKey(currentSectionId, activeGender);
      if (audioRef.current.dataset.sectionKey === key && audioRef.current.readyState > 0) {
        setSectionDuration(audioRef.current.duration || 0);
        store.setPlaying(!audioRef.current.paused);
        store.setLoading(false);
        return;
      }

      const wasPlaying = isPlaying;
      store.setPlaying(false);
      store.setLoading(true);

      const url = await fetchAudioUrl(currentSectionId, activeGender);
      if (!url) {
        store.setLoading(false);
        return;
      }

      audioRef.current.src = url;
      audioRef.current.dataset.sectionKey = key;
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.load();

      // Wait for canplay
      const handleCanPlay = () => {
        store.setLoading(false);
        setSectionDuration(audioRef.current?.duration || 0);
        if (wasPlaying) {
          audioRef.current?.play().catch(() => { });
          store.setPlaying(true);
        }
        audioRef.current?.removeEventListener('canplay', handleCanPlay);
      };
      audioRef.current.addEventListener('canplay', handleCanPlay);
    };

    loadAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, activeGender, isInitialized]);

  /* Audit fix 14 — announce section changes.
     Fires on every section change, however it was reached: auto-advance
     at the end of a track, a tap in the chapter list, or the named
     next/previous buttons. Two seconds is long enough to read and short
     enough not to become furniture. */
  useEffect(() => {
    if (!isInitialized || !currentSection) return;
    setNowPlayingStrip(currentSection.title);
    const t = setTimeout(() => setNowPlayingStrip(null), 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, isInitialized]);

  /* Audit fix 15 — queue the next section ahead.
     Every section used to be a fresh presigned URL fetched at the moment
     it was needed, so each boundary was a stall. Warming the next URL
     while the current one plays makes the handover free, and populates
     the same cache the retry path reads. */
  useEffect(() => {
    if (!isInitialized || !isPlaying) return;
    const next = store.getNextSection();
    if (!next) return;
    if (store.getCachedUrl(next.id, activeGender)) return;
    let cancelled = false;
    apiClient
      .get(`/audiobooks/sections/${next.id}/presign?gender=${activeGender}`)
      .then(res => { if (!cancelled && res.data?.url) store.cacheUrl(`${next.id}:${activeGender}`, res.data.url); })
      .catch(() => { /* prefetch is best-effort — the real fetch will retry */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, activeGender, isPlaying, isInitialized]);

  // ═══════════════════════════════════════════════════════════
  // TRANSCRIPT: Fetch when section changes
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentSectionId || !isInitialized) return;

    // The structure response already told us whether this section has a
    // transcript file — skip the request entirely when it doesn't, rather
    // than firing a request we know will 404 (the browser logs failed
    // network requests to the console regardless of try/catch on our end).
    if (!currentSection?.transcriptUrl) {
      store.setTranscriptText(null);
      return;
    }

    const fetchTranscript = async () => {
      try {
        const res = await apiClient.get(`/audiobooks/sections/${currentSectionId}/transcript`);
        store.setTranscriptText(typeof res.data === 'string' ? res.data : null);
      } catch {
        store.setTranscriptText(null);
      }
    };

    fetchTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, isInitialized, currentSection?.transcriptUrl]);

  // ═══════════════════════════════════════════════════════════
  // §5 WORD ALIGNMENT — only fetched when the transcript panel is open, since
  // this is a generate-on-first-request call (alignment.service.ts) and the
  // panel is exactly where the highlighting is shown. Same
  // has-a-transcript-file gate as the plain-text fetch above.
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentSectionId || !isInitialized || !showTranscript) return;
    if (!currentSection?.transcriptUrl) {
      store.setAlignedWords(null);
      return;
    }

    let cancelled = false;
    const fetchAlignment = async () => {
      try {
        const res = await apiClient.get(`/audiobooks/sections/${currentSectionId}/alignment?gender=${activeGender}`);
        if (!cancelled) store.setAlignedWords(Array.isArray(res.data) ? res.data : null);
      } catch {
        // Not fatal — the plain-paragraph transcript above still renders.
        // Most likely cause today: no OPENAI_API_KEY configured (§5's own
        // documented caveat), not a real per-request failure.
        if (!cancelled) store.setAlignedWords(null);
      }
    };

    fetchAlignment();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, activeGender, isInitialized, showTranscript, currentSection?.transcriptUrl]);

  // ═══════════════════════════════════════════════════════════
  // AUDIO EVENTS
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => { store.setPosition(audio.currentTime); };
    const onEnded = () => {
      /* Audit fix 15: "end of section" is the sleep option people
         actually want, and this is the only place it can be honoured —
         a countdown cannot know where a track ends. */
      if (useAudioPlayerStore.getState().sleepAtSectionEnd) {
        useAudioPlayerStore.getState().setSleepAtSectionEnd(false);
        store.setPlaying(false);
        return;
      }
      // Auto-advance to next section
      const next = store.getNextSection();
      if (next) {
        store.setCurrentSection(next.id);
        store.setPlaying(true);
      } else {
        store.setPlaying(false);
      }
    };
    const onError = () => {
      store.setError('Audio playback error. The file may be unavailable.');
      store.setPlaying(false);
      store.setLoading(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ═══════════════════════════════════════════════════════════
  // MEDIA SESSION API
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSection) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSection.title,
      artist: bookAuthor,
      album: bookTitle,
      artwork: coverUrl ? [{ src: coverUrl, sizes: '256x256', type: 'image/jpeg' }] : [],
    });

    navigator.mediaSession.setActionHandler('play', () => handlePlayPause());
    navigator.mediaSession.setActionHandler('pause', () => handlePlayPause());
    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevSection());
    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextSection());
    navigator.mediaSession.setActionHandler('seekbackward', () => handleSkip(-15));
    navigator.mediaSession.setActionHandler('seekforward', () => handleSkip(15));

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSection, bookTitle, bookAuthor, coverUrl]);

  // ═══════════════════════════════════════════════════════════
  // SLEEP TIMER TICK
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (sleepTimerRemaining === null || !isPlaying) return;
    const interval = setInterval(() => {
      const expired = store.tickSleepTimer();
      if (expired) {
        audioRef.current?.pause();
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepTimerRemaining, isPlaying]);

  // ═══════════════════════════════════════════════════════════
  // PROGRESS SYNC (debounced, every 30s)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isPlaying || !bookId || !currentSectionId) return;

    const interval = setInterval(async () => {
      try {
        await apiClient.put(`/audiobooks/${bookId}/progress`, {
          sectionId: currentSectionId,
          positionSeconds,
          activeGender,
          showTranscript,
          playbackRate,
        });
      } catch { /* silent */ }
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, bookId, currentSectionId]);

  // ═══════════════════════════════════════════════════════════
  // PLAYBACK CONTROLS
  // ═══════════════════════════════════════════════════════════
  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || isLoading || isFetchingUrl) return;

    try {
      if (isPlaying) {
        audio.pause();
        store.setPlaying(false);
      } else {
        await audio.play();
        store.setPlaying(true);
      }
    } catch {
      store.setError('Playback failed.');
      store.setPlaying(false);
    }
  };

  const handleSeek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Math.max(0, Math.min(sectionDuration, time));
    audio.currentTime = t;
    store.setPosition(t);
  };

  const handleSkip = (sec: number) => handleSeek(positionSeconds + sec);

  const handleNextSection = () => {
    const next = store.getNextSection();
    if (next) {
      store.setCurrentSection(next.id);
      // Auto-expand the chapter
      const ch = chapters.find(c => c.sections.some(s => s.id === next.id));
      if (ch && !openChapterIds.includes(ch.id)) {
        setOpenChapterIds(prev => [...prev, ch.id]);
      }
    }
  };

  const handlePrevSection = () => {
    // If more than 3 seconds in, restart current section
    if (positionSeconds > 3) {
      handleSeek(0);
      return;
    }
    const prev = store.getPrevSection();
    if (prev) {
      store.setCurrentSection(prev.id);
    }
  };

  const handleVolumeChange = (val: number) => {
    if (audioRef.current) audioRef.current.volume = val;
    store.setVolume(val);
  };

  /* Audit fix 14 — a Retry that does not throw the position away.
     Was `window.location.reload()`. A reload restarts the whole app and
     resumes from the last 30-second progress sync, so anything since
     that tick is lost — up to half a minute of listening, re-listened
     to, every time a presigned URL happens to expire.

     A presigned URL expiring is in fact the most likely failure here, so
     the fix is to drop the cached one, fetch a fresh one, and seek back
     to exactly where playback stopped. Nothing else about the session
     needs to change. */
  const handleRetry = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentSectionId) return;

    const resumeAt = positionSeconds;
    store.setError(null);
    store.setLoading(true);

    // Bypass the cache — a stale URL is the thing we are recovering from.
    let url: string | null = null;
    try {
      const res = await apiClient.get(`/audiobooks/sections/${currentSectionId}/presign?gender=${activeGender}`);
      url = res.data?.url ?? null;
      if (url) store.cacheUrl(`${currentSectionId}:${activeGender}`, url);
    } catch {
      store.setError('Still cannot reach the audio. Check your connection and try again.');
      store.setLoading(false);
      return;
    }
    if (!url) {
      store.setError('Still cannot reach the audio. Check your connection and try again.');
      store.setLoading(false);
      return;
    }

    audio.src = url;
    audio.dataset.sectionKey = sectionKey(currentSectionId, activeGender);
    audio.load();
    const onReady = () => {
      audio.currentTime = resumeAt;
      store.setPosition(resumeAt);
      store.setLoading(false);
      audio.play().then(() => store.setPlaying(true)).catch(() => { /* user gesture may be required */ });
      audio.removeEventListener('canplay', onReady);
    };
    audio.addEventListener('canplay', onReady);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSectionId, activeGender, positionSeconds]);

  /* Audit fix 15 — take a chapter offline.
     Fetches each section's audio and parks it in the Cache API, so the
     browser serves it from disk on the next request for the same URL.
     Deliberately not a Blob in memory: a chapter is tens of megabytes
     and would not survive a reload. */
  const handleDownloadChapter = useCallback(async (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter || downloadingChapter) return;
    setDownloadingChapter(chapterId);
    try {
      const cache = await caches.open('book-buddy-audio-v1');
      for (const section of chapter.sections) {
        const cached = store.getCachedUrl(section.id, activeGender);
        let url = cached;
        if (!url) {
          const res = await apiClient.get(`/audiobooks/sections/${section.id}/presign?gender=${activeGender}`);
          url = res.data?.url;
          if (url) store.cacheUrl(`${section.id}:${activeGender}`, url);
        }
        if (url) await cache.add(url);
      }
      setDownloadedChapters(prev => new Set(prev).add(chapterId));
    } catch {
      store.setError('Could not download this chapter. Check your connection and try again.');
    } finally {
      setDownloadingChapter(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapters, activeGender, downloadingChapter]);

  const handleSectionClick = (section: AudioSection) => {
    store.setCurrentSection(section.id);
    store.setPlaying(true);
  };

  const toggleChapterExpand = (chapterId: string) => {
    setOpenChapterIds(prev =>
      prev.includes(chapterId)
        ? prev.filter(id => id !== chapterId)
        : [...prev, chapterId]
    );
  };

  // ════════════════════════════════════════════════
  // PANEL (read-along / chapters), SENTENCES, AMBIENT COLOUR
  // ════════════════════════════════════════════════
  const ambient = useCoverColor(coverUrl);

  /* ── Minimise (phone): chevron-down or swipe down ──
     Leaves the full-screen Now Playing view; the shared audio element keeps playing
     and the mini player above the tab bar takes over (components/player/audio-session-bridge).
     With no history to return to (opened from a link), go to the dashboard instead. */
  const minimise = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push('/dashboard');
  }, [router]);

  /* Swipe down from the top half of the screen. The view follows the finger and
     dismisses past ~140px (or a quick flick); anything less springs back. Sliders,
     inputs, menus and anything marked data-no-swipe keep their own gestures. */
  const swipe = useRef<{ y: number; t: number } | null>(null);
  const [dragY, setDragY] = useState(0);
  const onSwipeStart = (e: React.TouchEvent) => {
    if (window.innerWidth >= 768 || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientY > window.innerHeight * 0.5) return;
    if ((e.target as HTMLElement).closest('input, textarea, [role="slider"], [role="menu"], [data-no-swipe]')) return;
    swipe.current = { y: t.clientY, t: Date.now() };
  };
  const onSwipeMove = (e: React.TouchEvent) => {
    if (!swipe.current) return;
    setDragY(Math.max(0, e.touches[0].clientY - swipe.current.y));
  };
  const onSwipeEnd = () => {
    if (!swipe.current) return;
    const velocity = dragY / Math.max(1, Date.now() - swipe.current.t);
    swipe.current = null;
    if (dragY > 140 || (dragY > 40 && velocity > 0.6)) minimise();
    else setDragY(0);
  };
  const ease = 'transform 240ms cubic-bezier(.2,.8,.2,1)';
  const swipeStyle: React.CSSProperties = dragY > 0
    ? { transform: `translateY(${dragY}px)`, borderRadius: Math.min(28, dragY / 4), transition: swipe.current ? 'none' : ease }
    : { transition: ease };

  /* The right-hand panel is a glass column from 1280px up and a bottom sheet below that.
     The transcript is fetched lazily while `showTranscript` is on (see the effect above),
     so opening the Read-along tab — or being wide enough to show it permanently — turns it on. */
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<'read' | 'chapters'>('read');
  const [isWide, setIsWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (isWide && isInitialized && !showTranscript) store.toggleTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWide, isInitialized]);

  const openPanel = (tab: 'read' | 'chapters') => {
    setPanelTab(tab);
    setPanelOpen(true);
    if (tab === 'read' && !showTranscript) store.toggleTranscript();
  };
  const selectTab = (tab: 'read' | 'chapters') => {
    setPanelTab(tab);
    if (tab === 'read' && !showTranscript) store.toggleTranscript();
  };

  // Group the word alignment into sentences so the read-along can dim past text and
  // brighten the sentence being spoken (a click seeks to the start of a sentence).
  const sentences = useMemo(() => {
    if (!alignedWords || alignedWords.length === 0) return [] as { start: number; end: number }[];
    const out: { start: number; end: number }[] = [];
    let start = 0;
    alignedWords.forEach((w, i) => {
      if (/[.!?।]["”')\]]*$/.test(w.word) || i === alignedWords.length - 1) {
        out.push({ start, end: i });
        start = i + 1;
      }
    });
    return out;
  }, [alignedWords]);
  const activeSentence = sentences.findIndex(s => currentWordIndex >= s.start && currentWordIndex <= s.end);

  useEffect(() => {
    if (activeSentence < 0) return;
    const el = transcriptScrollerRef.current?.querySelector(`[data-sent="${activeSentence}"]`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeSentence]);

  // ════════════════════════════════════════════════
  // TRANSCRIPT PARAGRAPHS
  // ════════════════════════════════════════════════
  const transcriptParagraphs = transcriptText ? transcriptText.split('\n').filter(p => p.trim()) : [];

  const sleepActive = !!(sleepAtSectionEnd || (sleepTimerRemaining && sleepTimerRemaining > 0));
  const cycleSpeed = () => {
    const i = PLAYBACK_SPEEDS.indexOf(playbackRate);
    const next = PLAYBACK_SPEEDS[(i + 1) % PLAYBACK_SPEEDS.length];
    store.setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const sleepMenu = showSleepMenu && (
    <div className={`${styles.menu} ${styles.menuUp}`} role="menu" aria-label="Sleep timer" style={{ left: '50%', right: 'auto', transform: 'translateX(-50%)' }}>
      {sleepActive && (
        <button className={`${styles.menuItem} ${styles.menuDanger}`} role="menuitem"
          onClick={() => { store.setSleepTimer(null); store.setSleepAtSectionEnd(false); setShowSleepMenu(false); }}>Off</button>
      )}
      {/* Audit fix 15: first in the list because it is the option people actually want —
          a fixed countdown cuts off mid-sentence; this stops at a boundary the book defines. */}
      <button className={`${styles.menuItem} ${sleepAtSectionEnd ? styles.menuItemActive : ''}`} role="menuitemradio" aria-checked={sleepAtSectionEnd}
        onClick={() => { store.setSleepAtSectionEnd(true); setShowSleepMenu(false); }}>End of section</button>
      {SLEEP_PRESETS.map(min => (
        <button key={min} className={styles.menuItem} role="menuitem"
          onClick={() => { store.setSleepTimer(min); setShowSleepMenu(false); }}>{min} min</button>
      ))}
    </div>
  );

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════
  const ambientStyle = { background: ambient } as const;

  // Error-only state
  if (error && !isInitialized) {
    return (
      <div className={styles.root} data-theme={theme}>
        <div className={`${styles.blob} ${styles.blobA}`} style={ambientStyle} />
        <div className={`${styles.blob} ${styles.blobB}`} />
        {/* Two different situations shared one "Audio Playback Error" card: arriving with no
            book at all, and a book that failed to load. Only the second is an error, and only
            the second can be retried. */}
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <Icon name={bookId ? 'alert' : 'audiobook'} size={28} />
          </div>
          <h2 className={styles.errorTitle}>{bookId ? 'This audiobook would not load' : 'Nothing playing yet'}</h2>
          <p className={styles.errorMessage}>{error}</p>
          <div className={styles.errorActions}>
            {bookId && (
              <button className={`${styles.glassBtn} ${styles.pill}`} onClick={() => window.location.reload()}>
                <Icon name="rotate-ccw" size={18} fillLayer={false} /> Try again
              </button>
            )}
            <button className={`${styles.glassBtn} ${styles.pill}`} onClick={() => router.push('/catalog')}>
              <Icon name="library" size={18} /> Browse library
            </button>
            <button className={`${styles.glassBtn} ${styles.pill}`} onClick={() => router.back()}>
              <Icon name="arrow-left" size={18} fillLayer={false} /> Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const chaptersList = (
    <>
      {!isOnline && (
        <div className={styles.offline}>
          <Icon name="wifi" size={16} fillLayer={false} />
          Offline - downloaded chapters only
        </div>
      )}
      {chapters.map(ch => {
        const isOpen = openChapterIds.includes(ch.id);
        const isActive = currentChapter?.id === ch.id;
        return (
          <div key={ch.id} className={styles.chapter}>
            <div
              className={`${styles.chapterHead} ${isActive ? styles.chapterHeadOn : ''}`}
              role="button" tabIndex={0} aria-expanded={isOpen}
              onClick={() => toggleChapterExpand(ch.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleChapterExpand(ch.id); } }}
            >
              <Icon name="chevron-right" size={16} fillLayer={false} className={`${styles.chev} ${isOpen ? styles.chevOpen : ''}`} />
              <span className={styles.clip}>{ch.title}</span>
              <span className={styles.count}>{ch.sections.length}</span>
              {/* Audit fix 15 - nothing survived a bad connection: every section was a fresh
                  presigned URL held only in memory. Chapters can now be taken offline. */}
              <button
                className={styles.iconTiny}
                onClick={(e) => { e.stopPropagation(); handleDownloadChapter(ch.id); }}
                disabled={downloadingChapter === ch.id || downloadedChapters.has(ch.id)}
                aria-label={downloadedChapters.has(ch.id) ? `${ch.title} is available offline` : `Download ${ch.title} for offline listening`}
              >
                {downloadedChapters.has(ch.id)
                  ? <Icon name="check-circle" size={18} />
                  : <Icon name={downloadingChapter === ch.id ? 'loader' : 'download'} size={18} className={downloadingChapter === ch.id ? styles.spin : undefined} />}
              </button>
            </div>
            {isOpen && (
              <div className={styles.sections}>
                {ch.sections.map(sec => (
                  <button
                    key={sec.id}
                    className={`${styles.section} ${currentSectionId === sec.id ? styles.sectionOn : ''}`}
                    aria-current={currentSectionId === sec.id ? 'true' : undefined}
                    onClick={() => handleSectionClick(sec)}
                  >
                    {sec.sectionType === 'INTRO' && <span className={styles.sectionTag}>Intro</span>}
                    <span className={styles.clip}>{sec.title}</span>
                    {sec.durationSeconds ? <span className={styles.dur}>{fmt(sec.durationSeconds)}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  const readAlong = (
    <div ref={transcriptScrollerRef}>
      {alignedWords && alignedWords.length > 0 ? (
        // §5 — word-level sync. The sentence being spoken is white, earlier text is dimmed,
        // later text is faint; clicking a sentence seeks the audio to its first word.
        <p className={styles.transcript}>
          {sentences.map((s, si) => {
            const state = si === activeSentence ? styles.sentNow : si < activeSentence ? styles.sentPast : '';
            return (
              <span
                key={si}
                data-sent={si}
                className={`${styles.sent} ${state}`}
                onClick={() => handleSeek(alignedWords[s.start].startMs / 1000)}
              >
                {alignedWords.slice(s.start, s.end + 1).map((w, k) => (
                  <span key={k} className={s.start + k === currentWordIndex ? styles.wordNow : undefined}>{w.word}{' '}</span>
                ))}
              </span>
            );
          })}
        </p>
      ) : transcriptParagraphs.length > 0 ? (
        transcriptParagraphs.map((para, idx) => (
          <p key={idx} className={`${styles.transcript} ${styles.plain}`}>{para}</p>
        ))
      ) : (
        <div className={styles.empty}>
          <Icon name="pdf" size={32} />
          <p>No transcript available for this section</p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={styles.root}
      data-theme={theme}
      onTouchStart={onSwipeStart}
      onTouchMove={onSwipeMove}
      onTouchEnd={onSwipeEnd}
      onTouchCancel={onSwipeEnd}
      style={swipeStyle}
    >
      <div className={`${styles.blob} ${styles.blobA}`} style={ambientStyle} />
      <div className={`${styles.blob} ${styles.blobB}`} />
      {/* Grabber: on phones this view can be swiped down into the mini player */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[calc(6px+var(--bb-safe-top))] z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-white/30 md:hidden" />

      {/* ═══ HEADER ═══ */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={`${styles.glassBtn} md:!hidden`} onClick={minimise} aria-label="Minimise player">
            <Icon name="chevron-down" size={22} fillLayer={false} />
          </button>
          <button className={`${styles.glassBtn} !hidden md:!inline-flex`} onClick={() => router.back()} aria-label="Go back">
            <Icon name="chevron-left" size={22} fillLayer={false} />
          </button>
          <div className={styles.headerBook}>
            <div className={styles.headerTitle}>{bookTitle || 'Loading…'}</div>
            <div className={styles.headerAuthor}>{bookAuthor}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* Narrator chip — one neutral control, opens a menu (fix 11). */}
          <div className={styles.narratorWrap}>
            <button
              className={`${styles.glassBtn} ${styles.pill}`}
              onClick={() => setShowNarratorMenu(v => !v)}
              aria-haspopup="menu"
              aria-expanded={showNarratorMenu}
              aria-label={`Narrator: ${NARRATORS[activeGender]}. Change narrator`}
            >
              <Icon name="profile" size={18} />
              <span className={styles.narratorLabel}>Narrator</span>
              <span>{NARRATORS[activeGender]}</span>
            </button>
            {showNarratorMenu && (
              <div className={styles.menu} role="menu" aria-label="Choose a narrator">
                {(Object.keys(NARRATORS) as AudioGender[]).map((g) => (
                  <button
                    key={g}
                    role="menuitemradio"
                    aria-checked={activeGender === g}
                    className={`${styles.menuItem} ${activeGender === g ? styles.menuItemActive : ''}`}
                    onClick={() => {
                      if (activeGender !== g) store.toggleGender();
                      setShowNarratorMenu(false);
                    }}
                  >
                    {NARRATORS[g]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className={styles.glassBtn} onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            <Icon name={theme === 'dark' ? 'sun' : 'theme'} size={20} />
          </button>
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className={styles.layout}>
        <main className={styles.stage}>
          {isLoading && !isInitialized && (
            <div className={styles.skeleton} role="status">
              <div className={styles.skel} style={{ width: 214, height: 300 }} />
              <div className={styles.skel} style={{ width: 240, height: 28 }} />
              <div className={styles.skel} style={{ width: 160, height: 16 }} />
              <div className={styles.skel} style={{ width: '80%', maxWidth: 400, height: 48 }} />
              <p style={{ color: 'var(--ap-muted)', fontSize: 14 }}>Loading audiobook…</p>
            </div>
          )}

          {isInitialized && (
            <>
              <div className={styles.stageTop}>
                <div className={styles.coverWrap}>
                  <div className={`${styles.coverGlow} ${isPlaying ? styles.coverGlowOn : ''}`} style={ambientStyle} />
                  <div className={styles.cover}>
                    {coverUrl && <img src={coverUrl} alt={`${bookTitle} cover`} />}
                    <div className={styles.coverSheen} />
                    <div className={styles.coverSpine} />
                    {isPlaying && (
                      <div className={styles.eq} aria-hidden="true">
                        <div className={styles.eqBar} /><div className={styles.eqBar} /><div className={styles.eqBar} /><div className={styles.eqBar} />
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.heading}>
                  <p className={styles.eyebrow}>{currentChapter?.title || 'Now playing'}</p>
                  <h1 className={styles.title}>{currentSection?.title || 'No section'}</h1>
                  {/* Audit fix 12 - one honest progress line: which section, how far through the
                      chapter, how long is left. The waveform stays as the scrubber. */}
                  <p className={styles.subtitle}>
                    {bookTitle}
                    {sectionOrdinal > 0 && <> &middot; Section {sectionOrdinal} of {sectionsInChapter}</>}
                    {chapterMinutesLeft !== null && <> &middot; {chapterMinutesLeft} min left in chapter</>}
                  </p>
                </div>
              </div>

              <div className={styles.waveformBlock}>
                <AudioWaveform
                  className={styles.waveform}
                  currentTime={positionSeconds}
                  duration={sectionDuration}
                  isPlaying={isPlaying}
                  onSeek={handleSeek}
                  trackColor={theme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(10,15,36,0.14)'}
                />
                <div className={styles.timeRow}>
                  <span>{fmt(positionSeconds)}</span>
                  <span>-{fmt(Math.max(0, sectionDuration - positionSeconds))}</span>
                </div>
              </div>

              {/* Audit fix 10 - three controls, not five: back 15, play, forward 15, with the
                  seek amount drawn inside the arc. Section jumps move to the line below. */}
              <div className={styles.controls}>
                <button className={`${styles.glassBtn} ${styles.seekBtn}`} onClick={() => handleSkip(-15)} aria-label="Back 15 seconds">
                  <Icon name="rotate-ccw" size={26} fillLayer={false} />
                  <span className={styles.seekAmount}>15</span>
                </button>
                <button className={styles.play} onClick={handlePlayPause}
                  aria-label={isPlaying ? 'Pause' : 'Play'} disabled={isLoading || isFetchingUrl}>
                  <Icon name={isPlaying ? 'pause' : 'play'} size={40} fillLayer={false} style={isPlaying ? undefined : { marginLeft: 4 }} />
                </button>
                <button className={`${styles.glassBtn} ${styles.seekBtn}`} onClick={() => handleSkip(15)} aria-label="Forward 15 seconds">
                  <Icon name="rotate-cw" size={26} fillLayer={false} />
                  <span className={styles.seekAmount}>15</span>
                </button>
              </div>

              {/* Named section jumps: the title of what is next tells you whether you want it. */}
              <div className={styles.jumpRow}>
                <button
                  className={styles.jump}
                  onClick={handlePrevSection}
                  disabled={!prevSection && positionSeconds <= 3}
                  aria-label={prevSection ? `Previous section: ${prevSection.title}` : 'Restart this section'}
                >
                  <Icon name="chevron-left" size={16} fillLayer={false} />
                  <span className={styles.jumpLabel}>
                    {positionSeconds > 3 ? 'Restart section' : prevSection ? prevSection.title : 'Start of book'}
                  </span>
                </button>
                <button
                  className={styles.jump}
                  onClick={handleNextSection}
                  disabled={!nextSection}
                  aria-label={nextSection ? `Next section: ${nextSection.title}` : 'This is the last section'}
                >
                  <span className={styles.jumpLabel}>{nextSection ? `Next: ${nextSection.title}` : 'Last section'}</span>
                  <Icon name="chevron-right" size={16} fillLayer={false} />
                </button>
              </div>

              {/* Speed (tablet and up; phones use the utility bar below) */}
              <div className={styles.speed} role="radiogroup" aria-label="Playback speed">
                {PLAYBACK_SPEEDS.map(speed => (
                  <button key={speed}
                    className={`${styles.speedBtn} ${playbackRate === speed ? styles.speedBtnOn : ''}`}
                    onClick={() => {
                      store.setPlaybackRate(speed);
                      if (audioRef.current) audioRef.current.playbackRate = speed;
                    }}
                    role="radio" aria-checked={playbackRate === speed}>
                    {speed}×
                  </button>
                ))}
              </div>

              {/* Tablet/desktop pills */}
              <div className={styles.pills}>
                <div style={{ position: 'relative' }}>
                  <button className={`${styles.glassBtn} ${styles.pill} ${sleepActive ? styles.glassBtnActive : ''}`}
                    onClick={() => setShowSleepMenu(v => !v)} aria-haspopup="menu" aria-expanded={showSleepMenu}>
                    <Icon name="theme" size={18} /> Sleep timer
                  </button>
                  {sleepMenu}
                </div>
                <button className={`${styles.glassBtn} ${styles.pill}`}
                  onClick={() => router.push(`/reader?bookId=${bookId ?? ''}`)}>
                  <Icon name="read" size={18} /> Switch to reading
                </button>
                <button className={`${styles.glassBtn} ${styles.pill} ${isChapterDrawerOpen ? styles.glassBtnActive : ''}`}
                  onClick={() => openPanel('chapters')} aria-label="Chapters and sections">
                  <Icon name="contents" size={18} /> Chapters
                </button>
                {/* Audit fix 13 - a volume control that can actually be used: Radix Slider underneath,
                    so keyboard support and the ARIA contract come with it. Hidden on coarse pointers
                    (the hardware keys do this). */}
                <div className={`${styles.volume} [@media(pointer:coarse)]:hidden`}>
                  <button className={`${styles.glassBtn} ${isMuted ? styles.glassBtnActive : ''}`}
                    onClick={() => store.toggleMute()} aria-label={isMuted ? 'Unmute' : 'Mute'} aria-pressed={isMuted}>
                    <Icon name={isMuted || volume === 0 ? 'volume-x' : 'volume'} size={20} />
                  </button>
                  <Slider
                    value={[Math.round((isMuted ? 0 : volume) * 100)]}
                    onValueChange={([v]) => handleVolumeChange(v / 100)}
                    max={100}
                    step={1}
                    aria-label="Volume"
                    className={styles.volumeSlider}
                  />
                </div>
              </div>

              {/* Phone: 4-cell glass utility bar */}
              <div className={styles.utility} role="group" aria-label="Playback options">
                <button className={styles.utilityCell} onClick={cycleSpeed} aria-label={`Speed ${playbackRate}×. Change speed`}>
                  <span className={styles.utilityValue}>{playbackRate}×</span>
                  <span className={styles.utilityLabel}>Speed</span>
                </button>
                <div className={styles.utilityCell} style={{ position: 'relative' }}>
                  <button className={styles.utilityCell} style={{ position: 'absolute', inset: 0, border: 0 }} onClick={() => setShowSleepMenu(v => !v)}
                    aria-haspopup="menu" aria-expanded={showSleepMenu} aria-label="Sleep timer">
                    <Icon name="theme" size={22} />
                    <span className={styles.utilityLabel}>{sleepActive ? 'On' : 'Sleep'}</span>
                  </button>
                  {sleepMenu}
                </div>
                <button className={styles.utilityCell} onClick={() => store.toggleGender()} aria-label={`Voice: ${NARRATORS[activeGender]}. Switch voice`}>
                  <span className={styles.utilityValue}>{NARRATORS[activeGender]}</span>
                  <span className={styles.utilityLabel}>Voice</span>
                </button>
                <button className={styles.utilityCell} onClick={() => openPanel('chapters')} aria-label="Chapters">
                  <Icon name="contents" size={22} />
                  <span className={styles.utilityLabel}>Chapters</span>
                </button>
              </div>

              {/* Read along is the transcript. Always one tap away below 1280, permanent above. */}
              <button className={`${styles.glassBtn} ${styles.pill} xl:hidden`} onClick={() => openPanel('read')} aria-label="Open transcript">
                <Icon name="pdf" size={18} />
                <span>
                  {alignedWords && alignedWords.length > 0 && currentWordIndex >= 0
                    ? `“…${alignedWords.slice(Math.max(0, currentWordIndex - 4), currentWordIndex + 4).map(w => w.word).join(' ')}…”`
                    : 'Read along'}
                </span>
              </button>

              {sleepActive && (
                <div className={styles.sleepBadge}>
                  <Icon name="theme" size={16} fillLayer={false} />
                  {sleepAtSectionEnd ? 'Stopping at the end of this section' : `Sleep in ${Math.ceil((sleepTimerRemaining ?? 0) / 60)} min`}
                </div>
              )}
            </>
          )}
        </main>

        {/* ═══ PANEL: Read along · Chapters ═══ */}
        {isInitialized && (panelOpen && !isWide) && <div className={styles.scrim} onClick={() => setPanelOpen(false)} />}
        {isInitialized && (
          <aside className={`${styles.panel} ${panelOpen ? styles.panelOpen : ''}`} aria-label="Read along and chapters">
            <div className={styles.grabber} aria-hidden="true" />
            <div className={styles.tabs} role="tablist">
              <button role="tab" aria-selected={panelTab === 'read'} className={`${styles.tab} ${panelTab === 'read' ? styles.tabOn : ''}`} onClick={() => selectTab('read')}>Read along</button>
              <button role="tab" aria-selected={panelTab === 'chapters'} className={`${styles.tab} ${panelTab === 'chapters' ? styles.tabOn : ''}`} onClick={() => selectTab('chapters')}>Chapters</button>
              <button className={`${styles.glassBtn} ${styles.panelClose}`} onClick={() => setPanelOpen(false)} aria-label="Close panel">
                <Icon name="close" size={18} fillLayer={false} />
              </button>
            </div>
            <div className={styles.panelBody}>{panelTab === 'read' ? readAlong : chaptersList}</div>
            <div className={styles.panelFoot}>
              <span>Up next</span>
              <strong>{nextSection ? nextSection.title : 'End of book'}</strong>
            </div>
          </aside>
        )}
      </div>

      {/* Audit fix 14 - the announcement strip and its live region. Auto-advance used to be
          silent. The aria-live region is always in the DOM so the announcement is not swallowed
          by the region appearing at the same moment as its content. */}
      <div className={styles.liveRegion} role="status" aria-live="polite" aria-atomic="true">
        {nowPlayingStrip ? `Now playing: ${nowPlayingStrip}` : ''}
      </div>
      {nowPlayingStrip && (
        <div className={styles.nowStrip} aria-hidden="true">
          Now: {nowPlayingStrip}
        </div>
      )}

      {/* Audit fix 14 - errors sit above the transport, not on it. */}
      {error && isInitialized && (
        <div className={styles.errorToast} role="alert">
          <Icon name="alert" size={20} style={{ flexShrink: 0 }} />
          <p className={styles.errorToastText}>{error}</p>
          <button className={`${styles.glassBtn} ${styles.pill}`} style={{ height: 36 }} onClick={handleRetry}>
            <Icon name="rotate-ccw" size={16} fillLayer={false} /> Retry
          </button>
          <button className={styles.iconTiny} onClick={() => store.setError(null)} aria-label="Dismiss error">
            <Icon name="close" size={18} fillLayer={false} />
          </button>
        </div>
      )}

      {/* Hidden audio element */}
    </div>
  );
}

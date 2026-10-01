'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, ChevronRight, Clock, FastForward, FileText,
  List, Moon, Pause, Play, Rewind, RotateCcw, Sun,
  Volume1, Volume2, VolumeX, X, AlertTriangle,
  User, Download, CheckCircle2, WifiOff, Headphones,
} from '@/components/ui/icons';
import { useAudioPlayerStore, AudioGender, PlaybackSpeed, AudioSection } from '@/store/useAudioPlayerStore';
import { AudioWaveform } from '@/components/player/AudioWaveform';
import { Slider } from '@/components/ui/slider';
import apiClient from '@/lib/apiClient';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

      const wasPlaying = isPlaying;
      store.setPlaying(false);
      store.setLoading(true);

      const url = await fetchAudioUrl(currentSectionId, activeGender);
      if (!url) {
        store.setLoading(false);
        return;
      }

      audioRef.current.src = url;
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

  // ═══════════════════════════════════════════════════════════
  // TRANSCRIPT PARAGRAPHS
  // ═══════════════════════════════════════════════════════════
  const transcriptParagraphs = transcriptText ? transcriptText.split('\n').filter(p => p.trim()) : [];

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // Error-only state
  if (error && !isInitialized) {
    return (
      <div className={styles.playerRoot} data-theme={theme}>
        <div className={styles.bgAmbience} />
        {/* Two different situations shared one "Audio Playback Error"
            card: arriving with no book at all, and a book that failed to
            load. Only the second is an error, and only the second can be
            retried. */}
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            {bookId ? <AlertTriangle size={28} /> : <Headphones size={28} />}
          </div>
          <h2 className={styles.errorTitle}>
            {bookId ? 'This audiobook would not load' : 'Nothing playing yet'}
          </h2>
          <p className={styles.errorMessage}>{error}</p>
          <div className={styles.errorActions}>
            {bookId && (
              <button className={styles.iconBtn} style={{ padding: '10px 20px', width: 'auto', borderRadius: 8 }}
                onClick={() => window.location.reload()}>
                <RotateCcw size={16} style={{ marginRight: 6 }} aria-hidden="true" /> Try again
              </button>
            )}
            <button className={styles.iconBtn} style={{ padding: '10px 20px', width: 'auto', borderRadius: 8 }}
              onClick={() => router.push('/catalog')}>
              <List size={16} style={{ marginRight: 6 }} aria-hidden="true" /> Browse library
            </button>
            <button className={styles.iconBtn} style={{ padding: '10px 20px', width: 'auto', borderRadius: 8 }}
              onClick={() => router.back()}>
              <ArrowLeft size={16} style={{ marginRight: 6 }} aria-hidden="true" /> Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.playerRoot} data-theme={theme}>
      <div className={styles.bgAmbience} />

      {/* ═══ HEADER ═══ */}
      <header className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <button className={styles.iconBtn} onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft size={18} />
          </button>
          {/* Audit fix 9: the only way into the chapter list used to be a
              38px tab pinned at top:50%, left:0 — vertically centred,
              hugging the screen edge, overlapping the cover art on small
              screens and easy to catch while scrolling. It is a normal
              header button now, at --hit-min. */}
          <button
            className={isChapterDrawerOpen ? styles.iconBtnActive : styles.iconBtn}
            onClick={() => store.toggleChapterDrawer()}
            aria-label="Chapters and sections"
            aria-expanded={isChapterDrawerOpen}
          >
            <List size={18} />
          </button>
          <div className={styles.headerBookInfo}>
            <div className={styles.headerTitle}>{bookTitle || 'Loading…'}</div>
            <div className={styles.headerAuthor}>{bookAuthor}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          {/* Narrator chip — one neutral control, opens a menu (fix 11). */}
          <div className={styles.narratorWrap}>
            <button
              className={styles.narratorChip}
              onClick={() => setShowNarratorMenu(v => !v)}
              aria-haspopup="menu"
              aria-expanded={showNarratorMenu}
              aria-label={`Narrator: ${NARRATORS[activeGender]}. Change narrator`}
            >
              <User size={14} aria-hidden="true" />
              <span className={styles.narratorLabel}>Narrator</span>
              <span className={styles.narratorName}>{NARRATORS[activeGender]}</span>
            </button>

            {showNarratorMenu && (
              <div className={styles.narratorMenu} role="menu" aria-label="Choose a narrator">
                {(Object.keys(NARRATORS) as AudioGender[]).map((g) => (
                  <button
                    key={g}
                    role="menuitemradio"
                    aria-checked={activeGender === g}
                    className={activeGender === g ? styles.narratorOptionActive : styles.narratorOption}
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
          <button className={styles.iconBtn} onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ═══ SIDEBAR OVERLAY (mobile) ═══ */}
      {(isChapterDrawerOpen || showTranscript) && (
        <div className={styles.overlay}
          onClick={() => {
            if (isChapterDrawerOpen) store.toggleChapterDrawer();
            if (showTranscript) store.toggleTranscript();
          }} />
      )}

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className={styles.mainLayout}>

        {/* ═══ LEFT SIDEBAR: Chapter → Section Tree ═══ */}
        <aside className={`${styles.sidebarDrawer} ${!isChapterDrawerOpen ? styles.sidebarDrawerHidden : ''}`}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Chapters</span>
            <button className={styles.iconBtn}
              onClick={() => store.toggleChapterDrawer()}
              aria-label="Close chapters">
              <X size={16} />
            </button>
          </div>
          {!isOnline && (
            <div className={styles.offlineBadge}>
              <WifiOff size={13} aria-hidden="true" />
              Offline - downloaded chapters only
            </div>
          )}
          <div className={styles.sidebarScroller}>
            {chapters.map(ch => {
              const isOpen = openChapterIds.includes(ch.id);
              const isActive = currentChapter?.id === ch.id;
              return (
                <div key={ch.id} className={styles.chapterGroup}>
                  <div
                    className={isActive ? styles.chapterHeaderActive : styles.chapterHeader}
                    onClick={() => toggleChapterExpand(ch.id)}
                  >
                    <ChevronRight size={14}
                      className={`${styles.chapterArrow} ${isOpen ? styles.chapterArrowOpen : ''}`} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ch.title}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{ch.sections.length}s</span>
                    {/* Audit fix 15 - nothing survived a bad connection.
                        Every section was a fresh presigned URL held only
                        in memory, with no download, no queue-ahead and no
                        offline state at all. */}
                    <button
                      className={styles.downloadBtn}
                      onClick={(e) => { e.stopPropagation(); handleDownloadChapter(ch.id); }}
                      disabled={downloadingChapter === ch.id || downloadedChapters.has(ch.id)}
                      aria-label={
                        downloadedChapters.has(ch.id)
                          ? `${ch.title} is available offline`
                          : `Download ${ch.title} for offline listening`
                      }
                    >
                      {downloadedChapters.has(ch.id)
                        ? <CheckCircle2 size={14} />
                        : downloadingChapter === ch.id
                          ? <Download size={14} className={styles.downloadSpin} />
                          : <Download size={14} />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className={styles.sectionList}>
                      {ch.sections.map(sec => (
                        <div
                          key={sec.id}
                          className={currentSectionId === sec.id ? styles.sectionItemActive : styles.sectionItem}
                          onClick={() => handleSectionClick(sec)}
                        >
                          {sec.sectionType === 'INTRO' && (
                            <span className={styles.sectionTypeTag}>Intro</span>
                          )}
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {sec.title}
                          </span>
                          {sec.durationSeconds && (
                            <span className={styles.sectionDuration}>{fmt(sec.durationSeconds)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ═══ CENTER CONTENT ═══ */}
        <main className={styles.centerContent}>
          {/* Loading skeleton */}
          {isLoading && !isInitialized && (
            <div className={styles.loadingSkeleton}>
              <div className={styles.skeletonPulse} style={{ width: 200, height: 200, borderRadius: 16 }} />
              <div className={styles.skeletonPulse} style={{ width: 240, height: 24 }} />
              <div className={styles.skeletonPulse} style={{ width: 160, height: 16 }} />
              <div className={styles.skeletonPulse} style={{ width: '80%', maxWidth: 400, height: 48 }} />
              <p style={{ color: 'var(--ap-text-muted)', fontSize: 14 }}>Loading audiobook…</p>
            </div>
          )}

          {isInitialized && (
            <>
              {/* The two edge tabs that used to live here at top:50% are
                  gone (audit fix 9). Chapters moved into the header;
                  the transcript is the peek bar above the bottom edge. */}

              {/* Cover Art */}
              <div className={styles.coverWrapper}>
                <div className={`${styles.coverGlow} ${isPlaying ? styles.coverGlowActive : ''}`} />
                <div className={styles.coverImage}>
                  <img src={coverUrl} alt={`${bookTitle} cover`} />
                  {isPlaying && (
                    <div className={styles.playingIndicator}>
                      <div className={styles.playingBar} />
                      <div className={styles.playingBar} />
                      <div className={styles.playingBar} />
                      <div className={styles.playingBar} />
                    </div>
                  )}
                </div>
              </div>

              {/* Now Playing Info */}
              <div className={styles.nowPlayingInfo}>
                <div className={styles.nowPlayingSection}>{currentSection?.title || 'No section'}</div>

                {/* Audit fix 12 - one honest progress line.
                    There used to be three progress indicators here: an
                    overall bar, a waveform, and an elapsed/remaining time
                    row - all three scoped to the *section*, so none of
                    them could answer where you are in the chapter, let
                    alone the book. Neither could they say which section
                    this is. One sentence says all three things; the
                    redundant overall bar is gone and the waveform stays
                    as the scrubber, which is the one job it did. */}
                <div className={styles.progressLine}>
                  {currentChapter?.title}
                  {sectionOrdinal > 0 && (
                    <> &middot; Section {sectionOrdinal} of {sectionsInChapter}</>
                  )}
                  {chapterMinutesLeft !== null && (
                    <> &middot; {chapterMinutesLeft} min left in chapter</>
                  )}
                </div>
              </div>

              {/* Waveform / Seek */}
              <div className={styles.waveformArea}>
                <AudioWaveform
                  currentTime={positionSeconds}
                  duration={sectionDuration}
                  isPlaying={isPlaying}
                  onSeek={handleSeek}
                  /* was a hardcoded amber #f59e0b / #d97706 - the palette
                     the rest of the player has already left behind. */
                  accentColor={theme === 'dark' ? '#FF8A5B' : '#B45309'}
                />
                <div className={styles.timeRow}>
                  <span>{fmt(positionSeconds)}</span>
                  <span>-{fmt(Math.max(0, sectionDuration - positionSeconds))}</span>
                </div>
              </div>

              {/* Audit fix 10 - three controls, not five.
                  Prev-section and back-15 both used a Rewind glyph;
                  next-section and forward-15 both used FastForward. Four
                  of the five buttons were two icons twice over, separated
                  only by a 9px label, and five 52px circles at 16px gaps
                  leave almost no margin at 360px.

                  The primary row is now the three controls a listener
                  reaches for constantly, with the seek amount drawn
                  inside the arc so the number *is* the icon. Section
                  jumps move to the line below, where they can name where
                  they are going. */}
              <div className={styles.controlsRow}>
                <button className={styles.seekBtn} onClick={() => handleSkip(-15)} aria-label="Back 15 seconds">
                  <Rewind size={18} aria-hidden="true" />
                  <span className={styles.seekAmount}>15</span>
                </button>
                <button className={styles.playPauseBtn} onClick={handlePlayPause}
                  aria-label={isPlaying ? 'Pause' : 'Play'} disabled={isLoading || isFetchingUrl}>
                  {isPlaying
                    ? <Pause size={32} strokeWidth={2.5} />
                    : <Play size={32} strokeWidth={2.5} style={{ marginLeft: 3 }} />}
                </button>
                <button className={styles.seekBtn} onClick={() => handleSkip(15)} aria-label="Forward 15 seconds">
                  <FastForward size={18} aria-hidden="true" />
                  <span className={styles.seekAmount}>15</span>
                </button>
              </div>

              {/* Named section jumps. "Next" told you nothing; the title
                  of what is next tells you whether you want it. */}
              <div className={styles.sectionJumpRow}>
                <button
                  className={styles.sectionJumpBtn}
                  onClick={handlePrevSection}
                  disabled={!prevSection && positionSeconds <= 3}
                  aria-label={prevSection ? `Previous section: ${prevSection.title}` : 'Restart this section'}
                >
                  <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
                  <span className={styles.sectionJumpLabel}>
                    {positionSeconds > 3 ? 'Restart section' : prevSection ? prevSection.title : 'Start of book'}
                  </span>
                </button>
                <button
                  className={styles.sectionJumpBtn}
                  onClick={handleNextSection}
                  disabled={!nextSection}
                  aria-label={nextSection ? `Next section: ${nextSection.title}` : 'This is the last section'}
                >
                  <span className={styles.sectionJumpLabel}>
                    {nextSection ? `Next: ${nextSection.title}` : 'Last section'}
                  </span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>

              {/* Speed Pills */}
              <div className={styles.speedRow} role="radiogroup" aria-label="Playback speed">
                {PLAYBACK_SPEEDS.map(speed => (
                  <button key={speed}
                    className={playbackRate === speed ? styles.speedPillActive : styles.speedPill}
                    onClick={() => {
                      store.setPlaybackRate(speed);
                      if (audioRef.current) audioRef.current.playbackRate = speed;
                    }}
                    role="radio" aria-checked={playbackRate === speed}>
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Secondary Controls */}
              <div className={styles.secondaryRow}>
                {/* Audit fix 13 - a volume control that can actually be
                    used. The old one was a bare <div role="slider"> with
                    aria-valuenow and tabIndex=0 but only an onClick: it
                    announced itself to a screen reader as an operable
                    slider, then ignored every arrow key. It also
                    duplicated the hardware volume keys on a phone, which
                    is why it is hidden on coarse pointers now.

                    The shadcn Slider is Radix underneath, so keyboard
                    support, focus and the ARIA contract come with it
                    rather than being hand-written and wrong. */}
                <div className={styles.volumeControl}>
                  <button className={isMuted ? styles.iconBtnActive : styles.iconBtn}
                    onClick={() => store.toggleMute()}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                    aria-pressed={isMuted}>
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
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

                <div className={styles.divider} />

                {/* Sleep Timer */}
                <div style={{ position: 'relative' }}>
                  <button className={sleepTimerRemaining ? styles.iconBtnActive : styles.iconBtn}
                    onClick={() => setShowSleepMenu(!showSleepMenu)} aria-label="Sleep timer">
                    <Clock size={18} />
                  </button>
                  {showSleepMenu && (
                    <div style={{
                      position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--ap-bg-glass)', backdropFilter: 'blur(20px)',
                      border: '1px solid var(--ap-border)', borderRadius: 12,
                      padding: 8, minWidth: 130, zIndex: 60,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                      {(sleepTimerRemaining || sleepAtSectionEnd) && (
                        <button className={styles.speedPill} style={{ width: '100%', color: 'var(--ap-danger)', marginBottom: 4 }}
                          onClick={() => { store.setSleepTimer(null); store.setSleepAtSectionEnd(false); setShowSleepMenu(false); }}>Off</button>
                      )}
                      {/* Audit fix 15: first in the list because it is the
                          option people actually want. A fixed countdown
                          cuts off mid-sentence; this stops at a boundary
                          the book itself defines. */}
                      <button
                        className={sleepAtSectionEnd ? styles.speedPillActive : styles.speedPill}
                        style={{ width: '100%', marginBottom: 6 }}
                        onClick={() => { store.setSleepAtSectionEnd(true); setShowSleepMenu(false); }}
                      >
                        End of section
                      </button>
                      {SLEEP_PRESETS.map(min => (
                        <button key={min} className={styles.speedPill} style={{ width: '100%', marginBottom: 2 }}
                          onClick={() => { store.setSleepTimer(min); setShowSleepMenu(false); }}>
                          {min} min
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sleep Badge */}
              {(sleepAtSectionEnd || (sleepTimerRemaining && sleepTimerRemaining > 0)) && (
                <div className={styles.sleepBadge}>
                  <Clock size={14} aria-hidden="true" />
                  {sleepAtSectionEnd
                    ? 'Stopping at the end of this section'
                    : `Sleep in ${Math.ceil((sleepTimerRemaining ?? 0) / 60)} min`}
                </div>
              )}
            </>
          )}
        </main>

        {/* Audit fix 9 - the transcript peek bar.
            The transcript used to be reachable only from a 38px tab
            pinned at top:50%, right:0 - edge-hugging, overlapping the
            cover on small screens, and easy to catch while scrolling.
            This bar sits above the bottom edge, shows the line being
            spoken, and drags the full panel up when tapped. It is both
            the affordance and a preview of what is behind it. */}
        {isInitialized && !showTranscript && (
          <button
            className={styles.transcriptPeek}
            onClick={() => store.toggleTranscript()}
            aria-label="Open transcript"
            aria-expanded={false}
          >
            <span className={styles.transcriptPeekText}>
              {alignedWords && alignedWords.length > 0 && currentWordIndex >= 0
                ? `\u201C\u2026${alignedWords.slice(Math.max(0, currentWordIndex - 5), currentWordIndex + 4).map(w => w.word).join(' ')}\u2026\u201D`
                : transcriptText
                  ? 'Read along with the transcript'
                  : 'No transcript for this section'}
            </span>
            <span className={styles.transcriptPeekTag}>TRANSCRIPT</span>
          </button>
        )}

        {/* ═══ RIGHT SIDEBAR: Transcript ═══ */}
        <aside className={`${styles.transcriptPanel} ${!showTranscript ? styles.transcriptPanelHidden : ''}`}>
          <div className={styles.sidebarHeader}>
            <span className={styles.sidebarTitle}>Transcript</span>
            <button className={styles.iconBtn}
              onClick={() => store.toggleTranscript()}
              aria-label="Close transcript">
              <X size={16} />
            </button>
          </div>
          <div className={styles.transcriptScroller} ref={transcriptScrollerRef}>
            {alignedWords && alignedWords.length > 0 ? (
              // §5 — word-level sync: render the aligned words as a flowing
              // sequence (paragraph breaks from the plain-text transcript
              // aren't reconstructed here — the alignment data doesn't carry
              // them — so this is one continuous block, a known trade-off of
              // this v1). The current word highlights as playback passes its
              // [startMs, endMs); clicking a word seeks the audio to it.
              <p className={styles.transcriptParagraph}>
                {alignedWords.map((w, idx) => (
                  <span
                    key={idx}
                    onClick={() => handleSeek(w.startMs / 1000)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 3,
                      padding: '0 1px',
                      backgroundColor: idx === currentWordIndex ? 'var(--ap-accent, #6366f1)' : 'transparent',
                      color: idx === currentWordIndex ? '#fff' : 'inherit',
                      transition: 'background-color 120ms ease',
                    }}
                  >
                    {w.word}{' '}
                  </span>
                ))}
              </p>
            ) : transcriptParagraphs.length > 0 ? (
              transcriptParagraphs.map((para, idx) => (
                <div key={idx} className={styles.transcriptParagraph}>
                  {para}
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ap-text-muted)' }}>
                <FileText size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: 13 }}>No transcript available for this section</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Audit fix 14 - the announcement strip and its live region.
          Auto-advance used to be silent: one track stopped, another
          started, and nothing said which. Sighted users get the strip;
          the aria-live region says the same words to a screen reader,
          and is always in the DOM (rather than mounted on change) so the
          announcement is not swallowed by the region appearing at the
          same moment as its content. */}
      <div className={styles.liveRegion} role="status" aria-live="polite" aria-atomic="true">
        {nowPlayingStrip ? `Now playing: ${nowPlayingStrip}` : ''}
      </div>
      {nowPlayingStrip && (
        <div className={styles.nowStrip} aria-hidden="true">
          Now: {nowPlayingStrip}
        </div>
      )}

      {/* Audit fix 14 - errors sit above the transport, not on it.
          The old toast was pinned at bottom:24 and landed squarely over
          the controls, so the first thing an error did was take away the
          buttons you would use to recover from it. */}
      {error && isInitialized && (
        <div className={styles.errorToast} role="alert">
          <AlertTriangle size={18} style={{ color: 'var(--ap-danger)', flexShrink: 0 }} aria-hidden="true" />
          <p className={styles.errorToastText}>{error}</p>
          <button className={styles.errorToastRetry} onClick={handleRetry}>
            <RotateCcw size={14} aria-hidden="true" /> Retry
          </button>
          <button onClick={() => store.setError(null)} aria-label="Dismiss error" className={styles.errorToastClose}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />
    </div>
  );
}

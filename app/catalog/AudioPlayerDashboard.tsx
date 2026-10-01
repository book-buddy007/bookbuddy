'use client';

import { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Headphones, Loader2, ChevronLeft, Play, Pause, Rewind, FastForward,
  List, FileText, Clock, User, UserRound, Volume2,
} from '@/components/ui/icons';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BrandMark } from '@/components/ui/brand-mark';
import type { CatalogBook, BookFormatType } from '@/types/catalog';
import AudiobookPlayerV2 from '@/app/player/v2/AudiobookPlayerV2';

const ALL = '__ALL__';

// MandalaMark's gradient reads var(--accent-primary)/var(--accent-strong),
// which only exist in the not-yet-deployed design system — without them the
// SVG's stop-color falls back to black. --gold IS live (styles/indic-design-
// system.css), so only the other two need a local scope override.
const mandalaVars = {
  '--gold': 'var(--gold, #FFB547)',
  '--accent-primary': 'var(--deep-saffron, #FF4D00)',
  '--accent-strong': 'var(--saffron, #FF8A3D)',
} as React.CSSProperties;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${inView ? 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500' : 'opacity-0'} ${className}`}
      style={inView ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : undefined}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LIVE PLAYER PROTOTYPE — a working, clickable replica of the real
// AudiobookPlayerV2 UI (same colors, same controls: waveform seek, 15s
// skip, speed pills, gender voice toggle, volume, sleep timer, chapter
// list, transcript), driven by a simulated position instead of a real
// audio file — this page is public (no login), so it never touches
// protected/presigned audio content. An auto-cycling spotlight walks
// through each control explaining what it does.
// ═══════════════════════════════════════════════════════════════════════

const DEMO_DURATION = 224; // seconds, matches the fake "Chapter 2" length below
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const GUIDE_STEPS = [
  { key: 'waveform', label: 'Tap anywhere to jump — scrub through the chapter instantly.' },
  { key: 'controls', label: '15-second skip, chapter-to-chapter navigation, one-tap play.' },
  { key: 'speed', label: 'Six speed presets — slow down for tough sections, speed up for review.' },
  { key: 'voice', label: 'Switch narrator voice — male or female — mid-sentence, no reload.' },
  { key: 'sleep', label: 'Set a sleep timer and drift off — playback stops itself.' },
  { key: 'chapters', label: 'Jump straight to any chapter or section from the list.' },
] as const;

function fmtTime(s: number): string {
  const secs = Math.max(0, Math.floor(s));
  const m = Math.floor(secs / 60);
  const sec = secs % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function AudioPlayerPrototype() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(38);
  const [speed, setSpeed] = useState(1);
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guidePaused, setGuidePaused] = useState(false);

  // Auto-cycling spotlight guide
  useEffect(() => {
    if (guidePaused) return;
    const t = setInterval(() => setGuideStep(s => (s + 1) % GUIDE_STEPS.length), 3200);
    return () => clearInterval(t);
  }, [guidePaused]);

  // Simulated playback tick
  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => {
      setPosition(p => {
        const next = p + speed;
        return next >= DEMO_DURATION ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [isPlaying, speed]);

  const progress = (position / DEMO_DURATION) * 100;
  const isActive = (key: (typeof GUIDE_STEPS)[number]['key']) => !guidePaused && GUIDE_STEPS[guideStep].key === key;

  const bars = useMemo(() => Array.from({ length: 48 }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 0.7)) * 44)), []);

  return (
    <div
      onMouseEnter={() => setGuidePaused(true)}
      onMouseLeave={() => setGuidePaused(false)}
      className="relative mx-auto max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-white/10"
      style={{ background: '#0a0a0f', color: '#f0f0f5', fontFamily: 'Inter, -apple-system, sans-serif' }}
    >
      {/* Ambient glow, matching the real player's bgAmbience */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{ width: 320, height: 320, top: -120, right: -80, background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)', opacity: 0.5 }}
        />
        <div
          className="absolute rounded-full"
          style={{ width: 260, height: 260, bottom: -100, left: -60, background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', opacity: 0.4, animationDelay: '1.5s' }}
        />
      </div>

      <div className="relative z-10 p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm font-semibold">Std 9 Science – NCERT Textbook</div>
            <div className="text-xs" style={{ color: '#a0a0b0' }}>NCERT</div>
          </div>
          <div className="relative">
            <div className={`flex rounded-full p-0.5 gap-0.5 ${isActive('voice') ? 'ring-2 ring-offset-2 ring-offset-[#0a0a0f] ring-amber-400' : ''}`} style={{ background: 'rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setGender('MALE')}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors"
                style={gender === 'MALE' ? { background: '#3b82f6', color: '#fff' } : { color: '#a0a0b0' }}
              >
                <User size={12} /> Male
              </button>
              <button
                onClick={() => setGender('FEMALE')}
                className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-full transition-colors"
                style={gender === 'FEMALE' ? { background: '#ec4899', color: '#fff' } : { color: '#a0a0b0' }}
              >
                <UserRound size={12} /> Female
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          {/* Cover */}
          <div className="relative shrink-0 mx-auto sm:mx-0">
            <div
              className={`h-28 w-28 sm:h-32 sm:w-32 rounded-2xl flex items-center justify-center`}
              style={{ background: 'linear-gradient(135deg, #FFB547, #D93A00)' }}
            >
              <Headphones className="h-10 w-10 text-white/90" />
            </div>
            {isPlaying && (
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-4">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className="w-1 rounded-full motion-safe:animate-pulse"
                    style={{ background: '#FFB547', height: 6 + (i % 3) * 4, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs mb-1" style={{ color: '#a0a0b0' }}>Chapter 2</div>
            <div className="text-base font-semibold mb-4">Force and Laws of Motion</div>

            {/* Waveform / seek */}
            <div className={`relative rounded-xl p-2 -m-2 ${isActive('waveform') ? 'ring-2 ring-amber-400' : ''}`}>
              <div
                className="flex items-end gap-[2px] h-10 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setPosition(Math.max(0, Math.min(DEMO_DURATION, pct * DEMO_DURATION)));
                }}
              >
                {bars.map((h, i) => {
                  const played = (i / bars.length) * 100 < progress;
                  return (
                    <span
                      key={i}
                      className="flex-1 rounded-full transition-colors"
                      style={{ height: `${h}%`, background: played ? '#FFB547' : 'rgba(255,255,255,0.12)' }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] tabular-nums mt-1.5" style={{ color: '#606070' }}>
                <span>{fmtTime(position)}</span>
                <span>-{fmtTime(DEMO_DURATION - position)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main controls */}
        <div className={`flex items-center justify-center gap-3 sm:gap-5 mb-5 rounded-xl p-2 -m-2 ${isActive('controls') ? 'ring-2 ring-amber-400' : ''}`}>
          <button className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: '#a0a0b0' }} aria-label="Previous section">
            <Rewind size={20} />
          </button>
          <button
            onClick={() => setPosition(p => Math.max(0, p - 15))}
            className="flex flex-col items-center gap-0.5 p-2 rounded-full transition-colors hover:bg-white/5"
            style={{ color: '#a0a0b0' }}
          >
            <Rewind size={18} />
            <span className="text-[9px] font-semibold">15s</span>
          </button>
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #FFB547, #D93A00)', boxShadow: '0 8px 24px rgba(245,158,11,0.35)' }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={26} className="text-white" strokeWidth={2.5} /> : <Play size={26} className="text-white ml-0.5" strokeWidth={2.5} />}
          </button>
          <button
            onClick={() => setPosition(p => Math.min(DEMO_DURATION, p + 15))}
            className="flex flex-col items-center gap-0.5 p-2 rounded-full transition-colors hover:bg-white/5"
            style={{ color: '#a0a0b0' }}
          >
            <FastForward size={18} />
            <span className="text-[9px] font-semibold">15s</span>
          </button>
          <button className="p-2 rounded-full transition-colors hover:bg-white/5" style={{ color: '#a0a0b0' }} aria-label="Next section">
            <FastForward size={20} />
          </button>
        </div>

        {/* Speed pills */}
        <div className={`flex justify-center gap-1.5 mb-5 rounded-xl p-2 -m-2 flex-wrap ${isActive('speed') ? 'ring-2 ring-amber-400' : ''}`}>
          {SPEEDS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
              style={speed === s ? { background: '#FFB547', color: '#0a0a0f' } : { background: 'rgba(255,255,255,0.06)', color: '#a0a0b0' }}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Secondary row */}
        <div className="flex items-center justify-center gap-4">
          <button className="p-1.5 rounded-full transition-colors hover:bg-white/5" style={{ color: '#a0a0b0' }} aria-label="Volume">
            <Volume2 size={18} />
          </button>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="relative">
            <button
              onClick={() => setSleepOpen(o => !o)}
              className={`p-1.5 rounded-full transition-colors hover:bg-white/5 ${isActive('sleep') ? 'ring-2 ring-amber-400' : ''}`}
              style={{ color: sleepMin ? '#FFB547' : '#a0a0b0' }}
              aria-label="Sleep timer"
            >
              <Clock size={18} />
            </button>
            {sleepOpen && (
              <div
                className="animate-in fade-in-0 zoom-in-95 duration-bb-ui absolute bottom-9 left-1/2 -translate-x-1/2 rounded-xl p-1.5 min-w-[110px] z-30 shadow-2xl border"
                style={{ background: 'rgba(20,20,28,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                {[15, 30, 45, 60].map(min => (
                  <button
                    key={min}
                    onClick={() => { setSleepMin(min); setSleepOpen(false); }}
                    className="w-full text-xs font-medium text-left px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                    style={{ color: '#f0f0f5' }}
                  >
                    {min} min
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="relative">
            <button
              onClick={() => setChaptersOpen(o => !o)}
              className={`p-1.5 rounded-full transition-colors hover:bg-white/5 ${isActive('chapters') ? 'ring-2 ring-amber-400' : ''}`}
              style={{ color: '#a0a0b0' }}
              aria-label="Chapters"
            >
              <List size={18} />
            </button>
            {chaptersOpen && (
              <div
                className="animate-in fade-in-0 zoom-in-95 duration-bb-ui absolute bottom-9 right-0 rounded-xl p-1.5 min-w-[190px] z-30 shadow-2xl border"
                style={{ background: 'rgba(20,20,28,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                {['1. Introduction', '2. Force and Laws of Motion', '3. Gravitation'].map((ch, i) => (
                  <div
                    key={ch}
                    className="text-xs font-medium px-3 py-2 rounded-lg"
                    style={i === 1 ? { background: 'rgba(245,158,11,0.12)', color: '#FFB547' } : { color: '#a0a0b0' }}
                  >
                    {ch}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-4" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="flex items-center gap-1.5 p-1.5 rounded-full text-bb-faint" aria-label="Transcript">
            <FileText size={18} />
          </div>
        </div>

        {sleepMin && (
          <div className="mt-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: 'rgba(245,158,11,0.12)', color: '#FFB547' }}>
              <Clock size={12} /> Sleep in {sleepMin} min
            </span>
          </div>
        )}
      </div>

      {/* Guide caption bar */}
      <div className="relative z-10 border-t px-5 sm:px-7 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
        <p key={guideStep} className="animate-in fade-in-0 duration-bb-ui text-xs sm:text-[13px] font-medium text-center" style={{ color: '#FFB547' }}>
          {GUIDE_STEPS[guideStep].label}
        </p>
        <div className="flex justify-center gap-1.5 mt-2">
          {GUIDE_STEPS.map((step, i) => (
            <button
              key={step.key}
              onClick={() => { setGuideStep(i); setGuidePaused(true); }}
              className="h-1.5 rounded-full transition-all"
              style={{ width: i === guideStep ? 18 : 6, background: i === guideStep ? '#FFB547' : 'rgba(255,255,255,0.15)' }}
              aria-label={`Guide step ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AudioPicker() {
  const router = useRouter();
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState(ALL);

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ limit: '100', status: 'PUBLISHED', format: 'AUDIOBOOK' });
        const [booksRes, categoriesRes] = await Promise.all([
          fetch(`/api/v1/books?${params.toString()}`),
          fetch('/api/v1/books/categories?type=GENRE'),
        ]);

        if (booksRes.ok) {
          const data = await booksRes.json();
          const mapped: CatalogBook[] = Array.isArray(data.data)
            ? data.data.map((b: any): CatalogBook => ({
                id: String(b.id),
                title: b.title ?? 'Untitled',
                author: b.author ?? 'Unknown Author',
                isbn: b.isbn ?? 'N/A',
                coverUrl: b.coverUrl ?? null,
                backCoverUrl: b.backCoverUrl ?? null,
                description: b.description ?? null,
                publisher: b.publisher ?? null,
                publishYear: b.publishYear ?? null,
                pages: b.pages ?? null,
                language: b.language ?? null,
                genre: Array.isArray(b.categories) ? b.categories.map((c: any) => c.name ?? c) : [],
                accessTier: (b.accessTier ?? 'FREE').toUpperCase(),
                formats: Array.isArray(b.bookFormats) ? [...new Set<BookFormatType>(b.bookFormats.map((f: any) => f.type))] : [],
                bookFormats: Array.isArray(b.bookFormats) ? b.bookFormats : [],
                available: b.available ?? true,
                rating: b.rating ?? null,
              }))
            : [];
          setBooks(mapped);
        }

        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          const names = Array.isArray(data) ? data.map((c: any) => c.name).filter(Boolean).sort() : [];
          setGenres(names);
        }
      } catch (e) {
        console.error('[AudioPlayerDashboard] Failed to load audiobooks:', e);
      }
    })();
  }, []);

  const booksInSubject = useMemo(
    () => (genreFilter === ALL ? books : books.filter(b => b.genre.includes(genreFilter))),
    [books, genreFilter]
  );

  const openPlayer = (bookId: string) => {
    router.push(`/catalog?format=AUDIOBOOK&bookId=${bookId}`);
  };

  return (
    <div className="min-h-screen w-full bg-[var(--ivory-cream)]">
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden mesh-bg-indic px-4 sm:px-6 pt-6 sm:pt-16 pb-16 sm:pb-20 text-center">
        
        <div className="relative z-10 flex justify-start mb-8 sm:mb-2 sm:absolute sm:top-6 sm:left-6">
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/70 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-500 relative z-10 flex justify-center mb-6">
          <div style={mandalaVars} className="drop-shadow-[0_0_24px_rgba(255,77,0,0.35)] relative">
            <BrandMark height={35} />
            <Headphones className="absolute -bottom-1 -right-1 h-6 w-6 text-white bg-[var(--peacock-teal)] rounded-full p-1 shadow-lg" />
          </div>
        </div>

        <h1
          className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 relative z-10 text-3xl sm:text-5xl font-extrabold text-white mb-4"
          style={{ fontFamily: 'var(--font-display)', animationDelay: '100ms', animationFillMode: 'both' }}
        >
          Press Play,{' '}
          <span className="text-bb-accent">
            Learn on the Go
          </span>
        </h1>
        <p
          className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 relative z-10 text-white/80 text-sm sm:text-base max-w-xl mx-auto"
          style={{ animationDelay: '200ms', animationFillMode: 'both' }}
        >
          Every audiobook in your library, narrated and ready — pick a subject, then a title, and it opens straight into the player.
        </p>
      </section>

      {/* ─── Filters (selection IS the navigation — no separate grid) ── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 mb-16">
        <div className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 rounded-bb-lg bg-bb-surface shadow-e1 p-4 sm:p-5 flex flex-col sm:flex-row gap-3" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--indigo-deep)] mb-1.5 block">Subject</label>
            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="bg-white border-[var(--deep-saffron)]/25">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Subjects</SelectItem>
                {genres.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--indigo-deep)] mb-1.5 block">Book Name</label>
            <Select value={ALL} onValueChange={(v) => { if (v !== ALL) openPlayer(v); }}>
              <SelectTrigger className="bg-white border-[var(--deep-saffron)]/25">
                <SelectValue placeholder="Choose an audiobook…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} disabled>
                  {booksInSubject.length === 0 ? 'No audiobooks available' : 'Choose an audiobook…'}
                </SelectItem>
                {booksInSubject.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ─── Live player prototype ────────────────────────────── */}
      <div className="px-4 sm:px-6 pb-8">
        <Reveal className="text-center mb-8 max-w-2xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--indigo-deep)] mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            See the audio player in action
          </h2>
          <p className="text-sm text-slate-500">
            A live, clickable preview — press play and try the controls. This is exactly what opens once you pick a book above.
          </p>
        </Reveal>
        <Reveal delay={100}>
          <AudioPlayerPrototype />
        </Reveal>
      </div>

      <div className="h-16" />
    </div>
  );
}

function AudioPlayerDashboardInner() {
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  if (bookId) {
    return <AudiobookPlayerV2 />;
  }
  return <AudioPicker />;
}

export function AudioPlayerDashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--ivory-cream)]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--deep-saffron)]" />
        </div>
      }
    >
      <AudioPlayerDashboardInner />
    </Suspense>
  );
}

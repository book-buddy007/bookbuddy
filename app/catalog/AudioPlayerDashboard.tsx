'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/ui/form-field';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { FeatureHero, FeatureSectionTitle, Reveal } from '@/components/landing/feature-landing';
import { cn } from '@/lib/utils';
import type { CatalogBook, BookFormatType } from '@/types/catalog';

const ALL = '__ALL__';

// ═══════════════════════════════════════════════════════════════════════
// PLAYER DEMO — a clickable replica of the real player's controls (waveform
// seek, ±15 s, sections, speed, narrator voice, sleep timer, chapters,
// read-along), driven by a simulated position. This page is public, so it
// never touches protected audio. A spotlight cycles through the controls.
// ═══════════════════════════════════════════════════════════════════════

const DEMO_DURATION = 224;
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const DEMO_CHAPTERS = ['Introduction', 'Force and laws of motion', 'Gravitation'];
const DEMO_LINES = [
  'A body stays at rest, or keeps moving in a straight line, unless a force acts on it.',
  'That tendency to resist a change in motion is what we call inertia.',
];

const GUIDE_STEPS = [
  { key: 'waveform', label: 'Tap anywhere on the waveform to jump through the chapter.' },
  { key: 'controls', label: '15-second skips, section to section, one-tap play.' },
  { key: 'speed', label: 'Six speeds: slow down for tough parts, speed up for revision.' },
  { key: 'voice', label: 'Switch narrator mid-sentence, without reloading.' },
  { key: 'sleep', label: 'Set a sleep timer and playback stops by itself.' },
  { key: 'chapters', label: 'Jump straight to any chapter from the list.' },
] as const;
type GuideKey = (typeof GUIDE_STEPS)[number]['key'];

function fmtTime(s: number): string {
  const secs = Math.max(0, Math.floor(s));
  return `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;
}

function GlassButton({
  icon, label, onClick, active, spotlight, size = 20, className,
}: { icon: BBIconName; label: string; onClick?: () => void; active?: boolean; spotlight?: boolean; size?: number; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.06] transition-colors duration-bb-micro hover:bg-white/[0.12] focus-visible:outline-none focus-visible:shadow-focus',
        active ? 'text-bb-blaze-light' : 'text-bb-dim',
        spotlight && 'ring-2 ring-bb-blaze-light ring-offset-2 ring-offset-bb-ink',
        className,
      )}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

function AudioPlayerPrototype() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(38);
  const [chapter, setChapter] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [voice, setVoice] = useState<'Aarav' | 'Meera'>('Aarav');
  const [muted, setMuted] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [sleepMin, setSleepMin] = useState<number | null>(null);
  const [chaptersOpen, setChaptersOpen] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [guideStep, setGuideStep] = useState(0);
  const [guidePaused, setGuidePaused] = useState(false);

  useEffect(() => {
    if (guidePaused) return;
    const t = setInterval(() => setGuideStep((s) => (s + 1) % GUIDE_STEPS.length), 3200);
    return () => clearInterval(t);
  }, [guidePaused]);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setPosition((p) => (p + speed >= DEMO_DURATION ? 0 : p + speed)), 1000);
    return () => clearInterval(t);
  }, [isPlaying, speed]);

  const progress = (position / DEMO_DURATION) * 100;
  const spot = (key: GuideKey) => !guidePaused && GUIDE_STEPS[guideStep].key === key;
  const bars = useMemo(() => Array.from({ length: 56 }, (_, i) => 18 + Math.round(Math.abs(Math.sin(i * 0.7)) * 44)), []);
  const goChapter = (i: number) => { setChapter(Math.max(0, Math.min(DEMO_CHAPTERS.length - 1, i))); setPosition(0); };

  return (
    <div
      onMouseEnter={() => setGuidePaused(true)}
      onMouseLeave={() => setGuidePaused(false)}
      onFocusCapture={() => setGuidePaused(true)}
      className="relative mx-auto max-w-2xl overflow-hidden rounded-bb-xl bg-bb-ink text-white shadow-e2"
    >
      {/* Ambient blobs, like the real player's cover-coloured glow */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,138,61,0.35)_0%,transparent_70%)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(59,91,219,0.3)_0%,transparent_70%)] blur-2xl" />

      <div className="relative p-5 sm:p-7">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Class 9 Science</p>
            <p className="text-xs text-bb-dim">NCERT</p>
          </div>
          {/* Narrator voice */}
          <div
            role="radiogroup"
            aria-label="Narrator"
            className={cn('flex shrink-0 gap-0.5 rounded-full bg-white/[0.06] p-1', spot('voice') && 'ring-2 ring-bb-blaze-light ring-offset-2 ring-offset-bb-ink')}
          >
            {(['Aarav', 'Meera'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={voice === v}
                onClick={() => setVoice(v)}
                className={cn(
                  'inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-colors duration-bb-micro',
                  voice === v ? 'bg-white text-bb-ink' : 'text-bb-dim hover:text-white',
                )}
              >
                <Icon name="mic" size={13} fillLayer={false} /> {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-6 sm:flex-row">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <div className="grid h-32 w-32 place-items-center rounded-bb-lg bg-[linear-gradient(135deg,#FF8A3D,#D93A00)] shadow-e2">
              <Icon name="audiobook" size={44} className="text-white" />
            </div>
            {isPlaying && (
              <div aria-hidden className="absolute -bottom-2 left-1/2 flex h-4 -translate-x-1/2 items-end gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="w-1 rounded-full bg-bb-blaze-light motion-safe:animate-pulse" style={{ height: 6 + (i % 3) * 4, animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-bb-blaze-light">Chapter {chapter + 1}</p>
            <p className="mb-4 mt-1 font-display text-xl font-extrabold tracking-[-0.02em]">{DEMO_CHAPTERS[chapter]}</p>

            <div className={cn('-m-2 rounded-bb-md p-2', spot('waveform') && 'ring-2 ring-bb-blaze-light')}>
              <div
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={DEMO_DURATION}
                aria-valuenow={Math.round(position)}
                aria-valuetext={fmtTime(position)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowRight') setPosition((p) => Math.min(DEMO_DURATION, p + 5));
                  if (e.key === 'ArrowLeft') setPosition((p) => Math.max(0, p - 5));
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPosition(Math.max(0, Math.min(DEMO_DURATION, ((e.clientX - rect.left) / rect.width) * DEMO_DURATION)));
                }}
                className="flex h-11 cursor-pointer items-end gap-[2px] rounded focus-visible:outline-none focus-visible:shadow-focus"
              >
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className={cn('flex-1 rounded-full transition-colors', (i / bars.length) * 100 < progress ? 'bg-bb-blaze-light' : 'bg-white/[0.14]')}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-bb-dim">
                <span>{fmtTime(position)}</span>
                <span>-{fmtTime(DEMO_DURATION - position)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Transport */}
        <div className={cn('-m-2 mb-3 flex items-center justify-center gap-3 rounded-bb-md p-2 sm:gap-4', spot('controls') && 'ring-2 ring-bb-blaze-light')}>
          <GlassButton icon="skip-back" label="Previous chapter" onClick={() => goChapter(chapter - 1)} />
          <GlassButton icon="rewind" label="Back 15 seconds" onClick={() => setPosition((p) => Math.max(0, p - 15))} />
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="grid h-16 w-16 place-items-center rounded-full bg-bb-primary text-white shadow-gloss transition-transform duration-bb-micro motion-safe:hover:scale-105 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={28} fillLayer={false} />
          </button>
          <GlassButton icon="fast-forward" label="Forward 15 seconds" onClick={() => setPosition((p) => Math.min(DEMO_DURATION, p + 15))} />
          <GlassButton icon="skip-forward" label="Next chapter" onClick={() => goChapter(chapter + 1)} />
        </div>

        {/* Speed */}
        <div role="radiogroup" aria-label="Playback speed" className={cn('-m-2 mb-4 flex flex-wrap justify-center gap-1.5 rounded-bb-md p-2', spot('speed') && 'ring-2 ring-bb-blaze-light')}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              onClick={() => setSpeed(s)}
              className={cn(
                'h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-bb-micro',
                speed === s ? 'bg-white text-bb-ink' : 'bg-white/[0.06] text-bb-dim hover:text-white',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        {/* Utilities */}
        <div className="flex items-center justify-center gap-2">
          <GlassButton icon={muted ? 'volume-x' : 'volume'} label={muted ? 'Unmute' : 'Mute'} active={muted} onClick={() => setMuted((m) => !m)} size={18} />
          <div className="relative">
            <GlassButton icon="overdue" label="Sleep timer" active={!!sleepMin} spotlight={spot('sleep')} onClick={() => { setSleepOpen((o) => !o); setChaptersOpen(false); }} size={18} />
            {sleepOpen && (
              <div role="menu" className="absolute bottom-12 left-1/2 z-30 min-w-[120px] -translate-x-1/2 rounded-bb-md border border-white/10 bg-bb-night-panel p-1.5 shadow-e2 animate-in fade-in-0 zoom-in-95 duration-bb-ui">
                {[15, 30, 45, 60].map((min) => (
                  <button key={min} type="button" role="menuitem" onClick={() => { setSleepMin(min); setSleepOpen(false); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium hover:bg-white/10">
                    {min} min
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <GlassButton icon="contents" label="Chapters" active={chaptersOpen} spotlight={spot('chapters')} onClick={() => { setChaptersOpen((o) => !o); setSleepOpen(false); }} size={18} />
            {chaptersOpen && (
              <div role="menu" className="absolute bottom-12 right-0 z-30 min-w-[210px] rounded-bb-md border border-white/10 bg-bb-night-panel p-1.5 shadow-e2 animate-in fade-in-0 zoom-in-95 duration-bb-ui">
                {DEMO_CHAPTERS.map((title, i) => (
                  <button
                    key={title}
                    type="button"
                    role="menuitem"
                    onClick={() => { goChapter(i); setChaptersOpen(false); }}
                    className={cn('w-full rounded-lg px-3 py-2 text-left text-xs font-medium', i === chapter ? 'bg-white/10 text-bb-blaze-light' : 'text-bb-dim hover:bg-white/10 hover:text-white')}
                  >
                    {i + 1}. {title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <GlassButton icon="read" label="Read-along" active={transcriptOpen} onClick={() => setTranscriptOpen((o) => !o)} size={18} />
        </div>

        {sleepMin && (
          <p className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-bb-blaze-light">
              <Icon name="overdue" size={12} /> Sleep in {sleepMin} min
            </span>
          </p>
        )}

        {transcriptOpen && (
          <div className="mt-5 rounded-bb-md border border-white/10 bg-white/[0.04] p-4 font-reading text-[17px] leading-relaxed animate-in fade-in-0 duration-bb-ui">
            <span className="text-white">{DEMO_LINES[0]} </span>
            <span className="text-white/40">{DEMO_LINES[1]}</span>
          </div>
        )}
      </div>

      {/* Guide caption */}
      <div className="relative border-t border-white/10 bg-white/[0.02] px-5 py-3 sm:px-7">
        <p key={guideStep} aria-live="polite" className="text-center text-xs font-medium text-bb-blaze-light animate-in fade-in-0 duration-bb-ui sm:text-[13px]">
          {GUIDE_STEPS[guideStep].label}
        </p>
        <div className="mt-2 flex justify-center gap-1.5">
          {GUIDE_STEPS.map((step, i) => (
            <button
              key={step.key}
              type="button"
              onClick={() => { setGuideStep(i); setGuidePaused(true); }}
              className={cn('h-1.5 rounded-full transition-all', i === guideStep ? 'w-[18px] bg-bb-blaze-light' : 'w-1.5 bg-white/20')}
              aria-label={`Guide step ${i + 1}: ${step.label}`}
              aria-current={i === guideStep ? 'step' : undefined}
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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams({ limit: '100', status: 'PUBLISHED', format: 'AUDIOBOOK' });
        const [booksRes, categoriesRes] = await Promise.all([
          fetch(`/api/v1/books?${params.toString()}`),
          fetch('/api/v1/books/categories?type=GENRE'),
        ]);

        if (!booksRes.ok) throw new Error(`books ${booksRes.status}`);
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
              // The list endpoint nests categories as { category: { name } }
              genre: Array.isArray(b.categories) ? b.categories.map((c: any) => c.category?.name ?? c.name ?? c).filter((g: any) => typeof g === 'string') : [],
              accessTier: (b.accessTier ?? 'FREE').toUpperCase(),
              formats: Array.isArray(b.bookFormats) ? [...new Set<BookFormatType>(b.bookFormats.map((f: any) => f.type))] : [],
              bookFormats: Array.isArray(b.bookFormats) ? b.bookFormats : [],
              available: b.available ?? true,
              rating: b.rating ?? null,
            }))
          : [];
        setBooks(mapped);

        if (categoriesRes.ok) {
          const cats = await categoriesRes.json();
          setGenres(Array.isArray(cats) ? cats.map((c: any) => c.name).filter(Boolean).sort() : []);
        }
        setStatus('ready');
      } catch (e) {
        console.error('[AudioPlayerDashboard] Failed to load audiobooks:', e);
        setStatus('error');
      }
    })();
  }, []);

  const booksInSubject = useMemo(
    () => (genreFilter === ALL ? books : books.filter((b) => b.genre.includes(genreFilter))),
    [books, genreFilter],
  );

  // The full player lives at /player (it owns the shared audio session).
  const openPlayer = (bookId: string) => router.push(`/player?bookId=${encodeURIComponent(bookId)}`);

  const bookPlaceholder =
    status === 'loading' ? 'Loading audiobooks…'
      : status === 'error' ? 'Couldn’t load audiobooks'
        : booksInSubject.length === 0 ? 'No audiobooks in this subject'
          : 'Choose an audiobook…';

  return (
    <div className="pb-16">
      <FeatureHero
        inset
        eyebrow="Audiobooks"
        icon="audiobook"
        title={<>Press play, <span className="text-bb-blaze-light">learn on the go</span></>}
        description="Every narrated title in your library. Pick a subject, then a book, and it opens straight into the player."
        back={{ href: '/dashboard', label: 'Dashboard' }}
      />

      {/* Picking a book IS the navigation; there is no separate grid. */}
      <div className="relative z-10 mx-auto -mt-14 mb-16 max-w-3xl px-2 sm:px-4">
        <div className="flex flex-col gap-4 rounded-bb-lg bg-bb-surface p-5 shadow-e2 sm:flex-row">
          <FormField label="Subject" htmlFor="audio-subject" className="flex-1">
            <Select value={genreFilter} onValueChange={setGenreFilter} disabled={status !== 'ready'}>
              <SelectTrigger id="audio-subject">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {genres.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            label="Book"
            htmlFor="audio-book"
            className="flex-1"
            error={status === 'error' ? 'The library didn’t respond. Refresh to try again.' : undefined}
          >
            <Select value={ALL} onValueChange={(v) => { if (v !== ALL) openPlayer(v); }} disabled={status !== 'ready' || booksInSubject.length === 0}>
              <SelectTrigger id="audio-book">
                <SelectValue placeholder={bookPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} disabled>{bookPlaceholder}</SelectItem>
                {booksInSubject.map((b) => <SelectItem key={b.id} value={b.id}>{b.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      <Reveal>
        <FeatureSectionTitle
          title="Try the player"
          description="A clickable preview of the controls. Press play and have a go; nothing here plays real audio."
        />
      </Reveal>
      <Reveal delay={100}>
        <AudioPlayerPrototype />
      </Reveal>
    </div>
  );
}

function AudioPlayerDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookId = searchParams.get('bookId');

  /* Old links (/catalog?format=AUDIOBOOK&bookId=…) used to embed the full player here.
     It now lives only at /player, which owns the app-wide audio session, so forward them. */
  useEffect(() => {
    if (bookId) router.replace(`/player?bookId=${encodeURIComponent(bookId)}`);
  }, [bookId, router]);

  if (bookId) {
    return (
      <div role="status" className="grid min-h-[50vh] place-items-center">
        <Icon name="loader" size={28} fillLayer={false} className="animate-spin text-bb-accent" />
      </div>
    );
  }
  return <AudioPicker />;
}

export function AudioPlayerDashboard() {
  return (
    <Suspense
      fallback={
        <div role="status" className="grid min-h-[50vh] place-items-center">
          <Icon name="loader" size={28} fillLayer={false} className="animate-spin text-bb-accent" />
        </div>
      }
    >
      <AudioPlayerDashboardInner />
    </Suspense>
  );
}

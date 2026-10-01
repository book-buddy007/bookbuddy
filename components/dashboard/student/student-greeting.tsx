'use client';

import { useCallback, useRef } from 'react';
import { Clock, GraduationCap, BookOpen, Flame } from '@/components/ui/icons';
import { MandalaSVG } from '@/components/landing/mandala-svgs';
import { MandalaMark } from '@/components/auth/mandala-mark';

// MandalaMark's gradient reads var(--accent-primary)/var(--accent-strong) —
// live in this app's design system, but scoped here too so the mark never
// silently falls back to black if load order ever changes.
const mandalaVars = {
  '--gold': 'var(--gold, #FFD700)',
  '--accent-primary': 'var(--deep-saffron, #FF9933)',
  '--accent-strong': 'var(--peacock-teal, #006A6E)',
} as React.CSSProperties;

interface StudentGreetingProps {
  userName: string | null;
  institutionName?: string;
  semester?: string;
  /** Optional reading streak count */
  streakDays?: number;
  /** Optional books currently borrowed */
  activeBooksCount?: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function StudentGreeting({
  userName,
  institutionName,
  semester,
  streakDays = 0,
  activeBooksCount = 0,
}: StudentGreetingProps) {
  const greeting = getGreeting();
  const displayName = userName?.split(' ')[0] || 'Student';
  const heroRef = useRef<HTMLElement>(null);

  // GPU cleanup: strip will-change after entrance animation completes
  const handleAnimEnd = useCallback(() => {
    heroRef.current?.classList.add('vg-anim-done');
  }, []);

  return (
    <section
      ref={heroRef}
      onAnimationEnd={handleAnimEnd}
      className="vg-stagger-entry relative overflow-hidden rounded-3xl p-6 md:p-10 shadow-2xl border border-white/10"
      style={{
        '--anim-delay': '0ms',
        background:
          'linear-gradient(135deg, var(--night-ink) 0%, var(--indigo-deep) 30%, var(--peacock-teal) 60%, var(--deep-saffron) 100%)',
      } as React.CSSProperties}
    >
      {/* Texture overlay — hidden on mobile for perf (content-visibility) */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none mix-blend-overlay hidden sm:block"
        style={{
          backgroundImage:
            'url("https://www.transparenttextures.com/patterns/cubes.png")',
        }}
      />

      {/* Ambient glow orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--deep-saffron)]/[0.15] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

      {/* Rotating mandala watermark — same motif as /catalog and /reader,
          scaled down and dimmed to sit quietly behind the greeting content. */}
      <div
        className="mandala-wrapper hidden sm:block"
        style={{ width: 460, height: 460, opacity: 0.12, right: '-8%', left: 'auto', top: '50%', transform: 'translateY(-50%)' }}
      >
        <MandalaSVG className="w-full h-full" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        {/* Left — Greeting text */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-3">
            <div style={mandalaVars} className="hidden sm:block shrink-0 drop-shadow-[0_0_16px_rgba(255,153,51,0.35)] relative">
              <MandalaMark size={40} />
              <BookOpen className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-white bg-[var(--peacock-teal)] rounded-full p-0.5 shadow-md" />
            </div>
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-white backdrop-blur-md shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-[var(--deep-saffron)] mr-2 animate-pulse" />
              Today&apos;s Learning
            </div>
          </div>

          <h1
            className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-sm"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {greeting},{' '}
            <span className="text-bb-accent">
              {displayName}.
            </span>
          </h1>

          <p className="text-indigo-100/90 text-lg max-w-xl font-medium">
            Pick up where you left off, listen while you commute, or ask{' '}
            <strong className="text-teal-300">Varta</strong> to clear your
            doubts.
          </p>
        </div>

        {/* Right — Quick metrics + Institution pill */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          {/* Mini stat badges */}
          <div className="flex items-center gap-3">
            {streakDays > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5 text-white shadow-sm">
                <Flame className="h-4 w-4 text-orange-400" />
                <span className="text-sm font-bold tabular-nums">
                  {streakDays}d
                </span>
                <span className="text-xs text-white/70">streak</span>
              </div>
            )}
            {activeBooksCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-3 py-1.5 text-white shadow-sm">
                <BookOpen className="h-4 w-4 text-teal-400" />
                <span className="text-sm font-bold tabular-nums">
                  {activeBooksCount}
                </span>
                <span className="text-xs text-white/70">active</span>
              </div>
            )}
          </div>

          {/* Institution pill */}
          {institutionName && (
            <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-md px-4 py-3 shadow-sm transition-transform hover:scale-105 duration-300">
              <GraduationCap className="h-4 w-4 text-[var(--gold)]" />
              <div className="leading-tight">
                <p className="text-[11px] font-semibold text-white truncate max-w-[160px]">
                  {institutionName}
                </p>
                {semester && (
                  <p className="text-[10px] text-white/70">{semester}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

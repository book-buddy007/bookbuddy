import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * Shared shell for the policy pages (/privacy, /terms, /cookies).
 *
 * These are plain server components with no data and no client hooks, so they
 * render at build time — the footer linked all three for months and every one
 * of them 404'd.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#FFFCF7] dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200">
      <div className="mx-auto w-full max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--deep-saffron)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1
          className="mt-8 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Last updated {updated}
        </p>

        <div className="legal-body mt-10 space-y-6 text-[15px] leading-relaxed">
          {children}
        </div>
      </div>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{heading}</h2>
      <div className="space-y-3 text-slate-600 dark:text-slate-300">{children}</div>
    </section>
  );
}

/**
 * Marks a value the operator must supply before this page is publishable.
 * Deliberately loud: a policy that ships with "[registered entity]" still
 * visible is worse than one that never shipped.
 */
export function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-amber-200/70 px-1 py-0.5 font-medium text-amber-950 dark:bg-amber-500/25 dark:text-amber-200">
      {children}
    </mark>
  );
}

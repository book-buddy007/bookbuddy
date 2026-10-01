import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLockup } from '@/components/ui/brand-mark';
import { Icon } from '@/components/ui/icon';
import { HomeFooter } from '@/components/home-footer';
import { cn } from '@/lib/utils';

const POLICIES = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/cookies', label: 'Cookies' },
] as const;

/**
 * Shared shell for the policy pages (/privacy, /terms, /cookies): a light content
 * page with a slim brand header, a reading-width column and the navy site footer.
 *
 * These are plain server components with no data and no client hooks, so they
 * render at build time.
 */
export function LegalPage({
  title,
  updated,
  current,
  children,
}: {
  title: string;
  updated: string;
  /** Path of this page, to mark it in the policy switcher. */
  current: (typeof POLICIES)[number]['href'];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bb-bg text-bb-text">
      <header className="border-b border-bb-border bg-bb-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4 sm:px-8">
          <Link href="/" aria-label="Book Buddy home" className="rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
            <BrandLockup size={20} />
          </Link>
          <nav aria-label="Policies" className="flex items-center gap-1 rounded-full bg-bb-surface-2 p-1">
            {POLICIES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={p.href === current ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-bb-micro focus-visible:outline-none focus-visible:shadow-focus',
                  p.href === current ? 'bg-bb-surface text-bb-text shadow-e1' : 'text-bb-muted hover:text-bb-text',
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-8 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Icon name="arrow-left" size={16} fillLayer={false} />
          Back to home
        </Link>

        <p className="mt-8 text-xs font-bold uppercase tracking-[0.12em] text-bb-accent-ink">Legal</p>
        <h1 className="mt-2 font-display text-[34px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[44px]">{title}</h1>
        <p className="mt-2 text-sm text-bb-muted">Last updated {updated}</p>

        <article className="mt-10 space-y-8 rounded-bb-lg bg-bb-surface p-6 text-[15px] leading-relaxed shadow-e1 sm:p-10">
          {children}
        </article>
      </main>

      <HomeFooter />
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold tracking-[-0.01em] text-bb-text">{heading}</h2>
      <div className="space-y-3 text-bb-muted [&_strong]:font-semibold [&_strong]:text-bb-text">{children}</div>
    </section>
  );
}

/** Banner at the top of a policy that has not had legal review yet. */
export function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex gap-3 rounded-bb-md bg-bb-warning-soft p-4 text-sm text-bb-warning-ink">
      <Icon name="alert" size={18} fillLayer={false} className="mt-0.5 shrink-0" />
      <p>
        <strong className="font-semibold">Draft pending legal review.</strong> {children}
      </p>
    </div>
  );
}

/**
 * Marks a value the operator must supply before this page is publishable.
 * Deliberately loud: a policy that ships with "[registered entity]" still
 * visible is worse than one that never shipped.
 */
export function Fill({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-bb-cream px-1 py-0.5 font-medium text-bb-ink dark:bg-bb-warning-soft dark:text-bb-warning-ink">
      {children}
    </mark>
  );
}

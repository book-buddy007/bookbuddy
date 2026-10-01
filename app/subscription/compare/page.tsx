import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BrandLockup } from '@/components/ui/brand-mark';
import { cn } from '@/lib/utils';
import { TIER_ORDER, type AccessTier } from '@/types/catalog';

export const metadata: Metadata = {
  title: 'Compare Plans — Book Buddy',
  description: 'What each Book Buddy access tier includes.',
};

/**
 * The comparison half of the upgrade path (the trial banner links here), built
 * from TIER_ORDER so it cannot drift from the tiers the catalogue actually gates
 * on. Pricing is deliberately NOT invented here: the CTA routes to contact until
 * real billing exists, because a made-up price is worse than no price.
 */
type Row = { label: string; minTier: AccessTier | null; note?: string };

const CAPABILITIES: Row[] = [
  { label: 'Browse the shared library', minTier: 'FREE' },
  { label: 'Borrow and read free titles', minTier: 'FREE' },
  { label: 'Highlights, notes and bookmarks', minTier: 'FREE' },
  { label: 'Dictionary and saved vocabulary', minTier: 'FREE' },
  { label: 'Flashcards with spaced repetition', minTier: 'FREE' },
  { label: 'Read-aloud (text to speech)', minTier: 'FREE' },
  { label: 'My Shelf — upload your own PDFs', minTier: 'FREE', note: '1 GB, 30 files' },
  { label: 'Bronze-tier titles', minTier: 'BRONZE' },
  { label: 'Silver-tier titles', minTier: 'SILVER' },
  { label: 'Audiobooks with read-along', minTier: 'GOLD' },
  { label: 'Gold-tier titles', minTier: 'GOLD' },
  { label: 'Varta — ask the book, cited to the page', minTier: 'DIAMOND' },
  { label: 'Quizzes and mastery tracking', minTier: 'DIAMOND' },
  { label: 'Chapter recaps', minTier: 'DIAMOND' },
  { label: 'Adaptive simplification', minTier: 'DIAMOND' },
  { label: 'Concept maps and entity search', minTier: 'DIAMOND' },
  { label: 'Diamond-tier titles', minTier: 'DIAMOND' },
];

/** The tier that carries the AI study tools gets the highlighted column. */
const FEATURED: AccessTier = 'DIAMOND';

function includes(tier: AccessTier, minTier: AccessTier | null): boolean {
  if (!minTier) return false;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minTier);
}

const titleCase = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

export default function ComparePlansPage() {
  return (
    <div className="min-h-dvh bg-bb-bg text-bb-text">
      <header className="border-b border-bb-border bg-bb-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-8">
          <Link href="/" aria-label="Book Buddy home" className="rounded-lg focus-visible:outline-none focus-visible:shadow-focus">
            <BrandLockup size={20} />
          </Link>
          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-bb-accent-ink hover:underline focus-visible:outline-none focus-visible:shadow-focus"
          >
            <Icon name="arrow-left" size={16} fillLayer={false} />
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-bb-accent-ink">Plans</p>
        <h1 className="mt-2 font-display text-[34px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[44px]">
          Compare plans
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-bb-muted">
          Every plan includes the reader, your notes and your shelf. Higher tiers unlock more of the library, and
          Diamond adds the AI study tools: Varta, quizzes, recaps and adaptive text.
        </p>

        <div className="mt-10 overflow-x-auto rounded-bb-lg bg-bb-surface shadow-e1">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <caption className="sr-only">Capabilities included in each plan</caption>
            <thead>
              <tr className="border-b border-bb-border">
                <th scope="col" className="sticky left-0 bg-bb-surface px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.08em] text-bb-muted">
                  Capability
                </th>
                {TIER_ORDER.map((tier) => (
                  <th
                    key={tier}
                    scope="col"
                    className={cn(
                      'px-4 py-4 text-center font-display text-[15px] font-bold',
                      tier === FEATURED && 'bg-bb-accent-soft text-bb-accent-ink',
                    )}
                  >
                    {titleCase(tier)}
                    {tier === FEATURED && (
                      <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.08em]">AI tools</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((row) => (
                <tr key={row.label} className="border-b border-bb-border last:border-0 hover:bg-bb-hover">
                  <th scope="row" className="sticky left-0 bg-bb-surface px-5 py-3 text-left font-medium text-bb-text">
                    {row.label}
                    {row.note && <span className="ml-2 text-xs font-normal text-bb-faint">{row.note}</span>}
                  </th>
                  {TIER_ORDER.map((tier) => (
                    <td key={tier} className={cn('px-4 py-3 text-center', tier === FEATURED && 'bg-bb-accent-soft/60')}>
                      {includes(tier, row.minTier) ? (
                        <Icon name="check" size={18} fillLayer={false} className="mx-auto text-bb-success-ink" aria-label="Included" />
                      ) : (
                        <Icon name="minus" size={16} fillLayer={false} className="mx-auto text-bb-faint" aria-label="Not included" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-10 flex flex-col gap-5 overflow-hidden rounded-bb-lg bg-bb-navy p-7 text-white shadow-[var(--bb-shadow-navy)] sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div>
            <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em]">Ready to upgrade?</h2>
            <p className="mt-2 max-w-xl text-sm text-bb-dim-2">
              Self-serve billing isn&apos;t live yet. Tell us which plan you want and we&apos;ll set it up on your account.
            </p>
          </div>
          <Button asChild size="lg" className="shrink-0">
            <a href="mailto:support@bookbuddyvpd.com?subject=Plan%20upgrade">
              Talk to us about upgrading
              <Icon name="mail" fillLayer={false} />
            </a>
          </Button>
        </section>
      </main>
    </div>
  );
}

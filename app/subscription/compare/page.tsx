import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, Minus } from '@/components/ui/icons';
import { TIER_ORDER, type AccessTier } from '@/types/catalog';

export const metadata: Metadata = {
  title: 'Compare Plans — Book Buddy',
  description: 'What each Book Buddy access tier includes.',
};

/**
 * The trial banner's two CTAs pushed /subscription/upgrade and
 * /subscription/compare, and SubscriptionBadge pushed /subscription/manage.
 * None of the three existed, so the whole conversion path — shown to students
 * whose trial is expiring — led to 404s.
 *
 * This is the comparison half, built from TIER_ORDER so it cannot drift from
 * the tiers the catalogue actually gates on. Pricing is deliberately NOT
 * invented here: the CTA routes to contact until real billing exists, because
 * a made-up price is worse than no price.
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

function includes(tier: AccessTier, minTier: AccessTier | null): boolean {
  if (!minTier) return false;
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(minTier);
}

export default function ComparePlansPage() {
  return (
    <main className="min-h-screen bg-[#FFFCF7] dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200">
      <div className="mx-auto w-full max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-2 text-sm font-medium text-[var(--deep-saffron)] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1
          className="mt-8 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Compare plans
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
          Every plan includes the reader, your notes and your shelf. Higher tiers
          unlock more of the library, and Diamond adds the AI study tools —
          Varta, quizzes, recaps and adaptive text.
        </p>

        <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[720px] border-collapse bg-white text-sm dark:bg-[#0F172A]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-5 py-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  Capability
                </th>
                {TIER_ORDER.map((tier) => (
                  <th
                    key={tier}
                    className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
                  >
                    {tier}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                >
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {row.label}
                    {row.note && (
                      <span className="ml-2 text-xs text-slate-400">{row.note}</span>
                    )}
                  </td>
                  {TIER_ORDER.map((tier) => (
                    <td key={tier} className="px-4 py-3 text-center">
                      {includes(tier, row.minTier) ? (
                        <Check
                          className="mx-auto h-4 w-4 text-emerald-600 dark:text-emerald-400"
                          aria-label="Included"
                        />
                      ) : (
                        <Minus
                          className="mx-auto h-4 w-4 text-slate-300 dark:text-slate-600"
                          aria-label="Not included"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 rounded-2xl border border-[var(--deep-saffron)]/30 bg-[var(--deep-saffron)]/5 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Ready to upgrade?
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300">
            Self-serve billing isn&apos;t live yet. Tell us which plan you want
            and we&apos;ll set it up on your account.
          </p>
          <a
            href="mailto:support@bookbuddyvpd.com?subject=Plan%20upgrade"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-[var(--deep-saffron)] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--saffron)]"
          >
            Talk to us about upgrading
          </a>
        </div>
      </div>
    </main>
  );
}

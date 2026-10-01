"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import apiClient from "@/lib/apiClient"
import Link from "next/link"
import { EnhancedButton } from "@/components/ui/enhanced-button"
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card"
import { TrialExpirationBanner } from "@/components/TrialExpirationBanner"
import { StartTrialButton, useCanStartTrial } from "@/components/subscription/StartTrialButton"
import { StudentGreeting } from "@/components/dashboard/student/student-greeting"
import { ContinueLearningRow, type ContinueBook } from "@/components/dashboard/student/continue-learning-row"
import { StudyStreamsGrid, type StudyStreamsData } from "@/components/dashboard/student/study-streams-grid"
import { UpcomingPanel, type UpcomingItem } from "@/components/dashboard/student/upcoming-and-activity"
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/student/upcoming-and-activity"
import { BookOpen, Clock, TrendingUp, Rocket, Library, ArrowRight } from "@/components/ui/icons"

export default function StudentDashboard() {
  const { userProfile, loading: profileLoading, error: profileError } = useUserProfile()

  // Dynamic Dashboard State
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([])
  const [readingHistory, setReadingHistory] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [overviewStats, setOverviewStats] = useState<any>(null)
  const [vartaActivity, setVartaActivity] = useState<any>(null)
  const [recentBooks, setRecentBooks] = useState<any[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)

  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuthStore()

  // Fetch Dashboard Specific Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthLoading && !isAuthenticated) return;
      setIsDataLoading(true);
      try {
        const [borrowedRes, historyRes, recsRes, overviewRes, vartaRes] = await Promise.all([
          apiClient.get('/library/borrowed').catch(() => ({ data: [] })),
          apiClient.get('/library/history').catch(() => ({ data: [] })),
          apiClient.get('/books/recommendations').catch(() => ({ data: [] })),
          apiClient.get('/analytics/overview').catch(() => ({ data: { totalBooks: 0, totalPages: 0 } })),
          // Global Varta activity → the "Recent questions" card. Was hardcoded [].
          apiClient.get('/students/me/varta-activity').catch(() => ({ data: null })),
        ]);

        setBorrowedBooks(borrowedRes.data || []);
        setReadingHistory(historyRes.data || []);
        setRecommendations(recsRes.data || []);
        setOverviewStats(overviewRes.data || null);
        setVartaActivity(vartaRes.data || null);
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, isAuthLoading]);

  // Recently-added catalogue books — powers the carousel shown to a student who
  // hasn't started reading yet (the "Browse Library" empty state). Public
  // endpoint, so it runs independent of auth.
  useEffect(() => {
    fetch('/api/v1/books?page=1&limit=12&status=PUBLISHED&sortBy=createdAt&sortOrder=desc')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = d?.data ?? d ?? [];
        setRecentBooks(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  // ──────── B2B Waiting Room Logic (preserved) ────────
  const isInstitutional = userProfile?.accountType === 'INSTITUTIONAL';
  const hasActiveMembership = userProfile?.memberships?.some((m: any) => m.status === 'ACTIVE');
  const latestJoinRequest = userProfile?.joinRequests?.[0];
  const isRejected = latestJoinRequest?.status === 'REJECTED';

  // Whether to offer the self-serve AI free trial (B2C student, no active
  // trial/paid plan). Declared here — above the early returns — so the hook order
  // stays stable regardless of which dashboard state renders.
  const canStartTrial = useCanStartTrial();

  const handleSwitchToIndependent = async () => {
    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountType: 'INDEPENDENT', onboardingStep: 3, onboardingCompleted: true }),
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  if (isInstitutional && !hasActiveMembership) {
    return (
      <div className="space-y-8 animate-vg-fade-in relative z-10 flex min-h-[70vh] flex-col items-center justify-center p-4">
        <EnhancedCard variant="glass" className="max-w-xl w-full text-center py-12">
          {isRejected ? (
            <>
              <EnhancedCardHeader>
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-6">
                  <span className="text-3xl">✖</span>
                </div>
                <EnhancedCardTitle className="text-3xl font-bold text-bb-accent">
                  Request Declined
                </EnhancedCardTitle>
              </EnhancedCardHeader>
              <EnhancedCardContent className="space-y-6">
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Your request to join <strong>{latestJoinRequest?.tenant?.name}</strong> was declined.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                  <EnhancedButton variant="outline" onClick={() => window.location.href = '/onboarding'}>
                    Re-apply
                  </EnhancedButton>
                  <EnhancedButton variant="vg-primary" onClick={handleSwitchToIndependent}>
                    Switch to Independent
                  </EnhancedButton>
                </div>
              </EnhancedCardContent>
            </>
          ) : (
            <>
              <EnhancedCardHeader>
                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-6">
                  <Clock className="w-8 h-8" />
                </div>
                <EnhancedCardTitle className="text-3xl font-bold text-bb-accent">
                  Waiting for Approval
                </EnhancedCardTitle>
              </EnhancedCardHeader>
              <EnhancedCardContent className="space-y-6">
                <p className="text-lg text-slate-600 dark:text-slate-400">
                  Your account has been created, but you must wait for your institution&apos;s administrator to approve your join request before you can access the library.
                </p>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-sm">
                  You will receive an email once your account is ready.
                </div>
                <EnhancedButton variant="outline" onClick={() => window.location.reload()}>
                  Refresh Status
                </EnhancedButton>
              </EnhancedCardContent>
            </>
          )}
        </EnhancedCard>
      </div>
    );
  }

  // ──────── Map API data → component props ────────

  // Continue-learning cards from borrowed books. Progress is the real
  // ReadingProgress row the backend attaches per book (null if never opened).
  const continueBooks: ContinueBook[] = borrowedBooks.slice(0, 5).map((b: any) => {
    const pct = Math.round(b.progress?.percentComplete ?? 0);
    return {
      id: b.id,
      title: b.book?.title || 'Untitled',
      author: b.book?.author || 'Unknown',
      coverUrl: b.book?.coverUrl,
      progress: b.progress
        ? `${pct}% complete`
        : `Borrowed ${new Date(b.borrowedAt).toLocaleDateString()}`,
      progressPercent: pct,
      formats: [b.book?.format || 'EPUB', ...(b.book?.hasAudio ? ['Audio'] : []), 'Varta'],
      hasNotes: true,
      hasAudio: !!b.book?.hasAudio,
      hasVartaAI: true,
      readerHref: '/reader',
    };
  });

  // Books actually opened, most-recently-read first — real progress only.
  const booksOpened = borrowedBooks
    .filter((b: any) => b.progress)
    .sort(
      (a: any, b: any) =>
        new Date(b.progress.lastReadAt).getTime() - new Date(a.progress.lastReadAt).getTime(),
    )
    .slice(0, 3)
    .map((b: any) => ({
      title: b.book?.title || 'Book',
      chapter: b.progress.currentPage > 0 ? `Page ${b.progress.currentPage}` : 'Started',
      percent: Math.round(b.progress.percentComplete ?? 0),
    }));

  // Study streams data
  const streamsData: StudyStreamsData = {
    reading: {
      minutesReadToday: overviewStats?.minutesReadToday ?? 0,
      booksOpened,
    },
    vartaAI: {
      // Real recent questions the student asked Varta (global scope). recentChats
      // are role=USER messages, so `preview` is the question text itself.
      recentQuestions: (vartaActivity?.recentChats ?? [])
        .slice(0, 3)
        .map((c: any) => ({ question: c.preview, source: c.bookTitle })),
    },
    sanchika: {
      highlights: overviewStats?.highlights ?? 0,
      flashcards: overviewStats?.flashcards ?? 0,
      explanations: overviewStats?.explanations ?? 0,
    },
    audio: undefined,
  };

  // Upcoming items from due-soon books
  const upcomingItems: UpcomingItem[] = borrowedBooks
    .filter((b: any) => b.dueDate)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4)
    .map((b: any) => {
      const daysLeft = Math.ceil((new Date(b.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        title: `Return: ${b.book?.title || 'Book'}`,
        subtitle: daysLeft <= 0 ? 'Overdue!' : daysLeft <= 3 ? `Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : `Due ${new Date(b.dueDate).toLocaleDateString()}`,
        priority: (daysLeft <= 3 ? 'high' : 'normal') as 'high' | 'normal',
      };
    });

  // Activity feed from reading history
  const activityItems: ActivityItem[] = readingHistory.slice(0, 6).map((r: any, i: number) => ({
    id: r.id || String(i),
    message: `Returned "${r.book?.title || 'a book'}" by ${r.book?.author || 'unknown author'}`,
    type: 'reading' as const,
    timestamp: r.returnedAt ? new Date(r.returnedAt).toLocaleDateString() : undefined,
  }));

  // Institution name for greeting pill
  const activeMembership = userProfile?.memberships?.find((m: any) => m.status === 'ACTIVE');
  const institutionName = activeMembership?.tenantName;

  return (
    <div className="space-y-6 pb-4 relative z-10">
      {/* Trial banner */}
      <TrialExpirationBanner />

      {/* Self-serve AI free-trial CTA — only for B2C students without an active
          trial/paid plan (hook returns false otherwise, so this hides itself). */}
      {canStartTrial && <StartTrialButton variant="card" />}

      {/* ① Hero Greeting — Phase 1: Premium glassmorphic banner with stagger delay 0ms */}
      <StudentGreeting
        userName={user?.name ?? null}
        institutionName={institutionName}
        streakDays={overviewStats?.streak ?? 0}
        activeBooksCount={borrowedBooks.length}
      />

      {/* ② Stats strip — Phase 3: Stagger delay 100ms */}
      <StaggerWrapper delay={100}>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <StatPill
            label="Books Borrowed"
            value={overviewStats?.totalBooks ?? borrowedBooks.length}
            icon={<BookOpen className="h-5 w-5" />}
            accent="saffron"
            isLoading={isDataLoading}
          />
          <StatPill
            label="Pages Read"
            value={overviewStats?.totalPages ?? 0}
            icon={<Library className="h-5 w-5" />}
            accent="teal"
            isLoading={isDataLoading}
          />
          <StatPill
            label="Reading Streak"
            value={`${overviewStats?.streak ?? 0}d`}
            icon={<TrendingUp className="h-5 w-5" />}
            accent="gold"
            isLoading={isDataLoading}
          />
        </div>
      </StaggerWrapper>

      {/* ③ Continue learning — Phase 2: EnhancedCard wrapper + stagger 200ms */}
      <StaggerWrapper delay={200}>
        <EnhancedCard className="border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md shadow-sm hover-vg-lift-safe">
          <EnhancedCardContent className="pt-6 pb-4 px-4 sm:px-6">
            <ContinueLearningRow
              books={continueBooks}
              isLoading={isDataLoading}
              recentBooks={recentBooks.slice(0, 10).map((b: any) => ({
                id: b.id,
                title: b.title,
                author: b.author,
                coverUrl: b.coverUrl,
              }))}
            />
          </EnhancedCardContent>
        </EnhancedCard>
      </StaggerWrapper>

      {/* ④ Study streams + sidebar — Phase 2: EnhancedCard wrapper + stagger 300ms */}
      <StaggerWrapper delay={300}>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
          <EnhancedCard className="border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-bb-bg/70 backdrop-blur-md shadow-sm hover-vg-lift-safe">
            <EnhancedCardContent className="pt-6 pb-4 px-4 sm:px-6">
              <StudyStreamsGrid data={streamsData} isLoading={isDataLoading} />
            </EnhancedCardContent>
          </EnhancedCard>

          <div className="space-y-6">
            <UpcomingPanel items={upcomingItems} isLoading={isDataLoading} />
            <ActivityFeed items={activityItems} isLoading={isDataLoading} />
          </div>
        </div>
      </StaggerWrapper>

      {/* ⑤ Library CTA — Phase 6: content-visibility: auto for LCP savings */}
      <StaggerWrapper delay={400}>
        <section
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--night-ink)] via-[var(--indigo-deep)] to-[var(--peacock-teal)] p-8 sm:p-10 shadow-lg mt-4"
          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 180px' } as React.CSSProperties}
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[var(--deep-saffron)]/20 to-[var(--gold)]/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h2
                className="text-xl sm:text-2xl font-semibold text-white mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Discover more in the library
              </h2>
              <p className="text-base text-white/70 max-w-md">
                Browse textbooks, reference material, and audiobooks curated for your curriculum.
              </p>
            </div>
            <Link
              href="/catalog"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--deep-saffron)] px-8 text-base font-semibold text-white shadow-md hover:bg-[var(--saffron)] hover:shadow-lg transition-all whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[var(--deep-saffron)]/50 focus:ring-offset-2 focus:ring-offset-[var(--night-ink)] shrink-0"
            >
              <Rocket className="h-5 w-5" />
              Browse Library
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </StaggerWrapper>
    </div>
  )
}

/* ───── Stagger Wrapper — Phase 3 ─────
   Applies vg-stagger-entry with --anim-delay custom property.
   Cleans up will-change on animation end to free GPU memory.
*/
function StaggerWrapper({ delay, children }: { delay: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const handleAnimEnd = useCallback(() => {
    ref.current?.classList.add('vg-anim-done');
  }, []);

  return (
    <div
      ref={ref}
      className="vg-stagger-entry"
      style={{ '--anim-delay': `${delay}ms` } as React.CSSProperties}
      onAnimationEnd={handleAnimEnd}
    >
      {children}
    </div>
  );
}

/* ───── Vibrant stat card — Phase 2+5: hover-vg-lift-safe gated lift ───── */
function StatPill({
  label,
  value,
  icon,
  accent,
  isLoading,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: 'saffron' | 'teal' | 'gold';
  isLoading?: boolean;
}) {
  const themes = {
    saffron: {
      card: 'bg-gradient-to-br from-bb-accent-soft via-bb-accent-soft to-bb-accent-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-accent/30',
      iconBg: 'bg-gradient-to-br from-bb-accent to-bb-accent text-white shadow-lg shadow-bb-accent/30',
      valueColor: 'text-bb-accent dark:text-bb-accent',
    },
    teal: {
      card: 'bg-gradient-to-br from-bb-info-soft via-bb-info-soft to-bb-info-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-cobalt/30',
      iconBg: 'bg-gradient-to-br from-bb-cobalt to-bb-cobalt text-white shadow-lg shadow-bb-cobalt/30',
      valueColor: 'text-bb-text dark:text-bb-text',
    },
    gold: {
      card: 'bg-gradient-to-br from-bb-info-soft via-bb-info-soft to-bb-info-soft dark:from-bb-surface dark:via-bb-surface dark:to-bb-surface border-bb-cobalt/30',
      iconBg: 'bg-gradient-to-br from-bb-cobalt to-bb-cobalt text-white shadow-lg shadow-bb-cobalt/30',
      valueColor: 'text-bb-text dark:text-bb-text',
    },
  };
  const theme = themes[accent];

  return (
    <div
      className={`
        group flex items-center gap-5 rounded-2xl border
        ${theme.card}
        px-6 py-5 shadow-md backdrop-blur-md transition-all duration-300
        hover-vg-lift-safe cursor-default
      `}
    >
      <div className={`shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl ${theme.iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        {icon}
      </div>
      <div className="min-w-0">
        {isLoading ? (
          <div className="h-7 w-14 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        ) : (
          <p className={`text-2xl sm:text-3xl font-extrabold leading-none tabular-nums ${theme.valueColor}`}>
            {value}
          </p>
        )}
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">
          {label}
        </p>
      </div>
    </div>
  );
}

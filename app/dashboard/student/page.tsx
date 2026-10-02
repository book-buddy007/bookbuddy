"use client"

import { useState,useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import apiClient from "@/lib/apiClient"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { Icon } from "@/components/ui/icon"
import { TrialExpirationBanner } from "@/components/TrialExpirationBanner"
import { StartTrialButton,useCanStartTrial } from "@/components/subscription/StartTrialButton"
import { ContinueLearningRow,type ContinueBook } from "@/components/dashboard/student/continue-learning-row"
import { StudyStreamsGrid,type StudyStreamsData } from "@/components/dashboard/student/study-streams-grid"
import { UpcomingPanel,type UpcomingItem } from "@/components/dashboard/student/upcoming-and-activity"
import { ActivityFeed,type ActivityItem } from "@/components/dashboard/student/upcoming-and-activity"

export default function StudentDashboard() {
  const { userProfile } = useUserProfile()

  // Dynamic Dashboard State
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([])
  const [readingHistory, setReadingHistory] = useState<any[]>([])
  const [, setRecommendations] = useState<any[]>([])
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
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-xl rounded-[22px] p-8 text-center sm:p-12">
          <span
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full ${
              isRejected ? "bg-bb-danger-soft" : "bg-bb-warning-soft"
            }`}
          >
            <Icon name={isRejected ? "x-circle" : "calendar"} size={32} />
          </span>
          {isRejected ? (
            <>
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">Request declined</h1>
              <p className="mt-3 text-bb-muted">
                Your request to join <strong className="text-bb-text">{latestJoinRequest?.tenant?.name}</strong> was declined.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => (window.location.href = "/onboarding")}>
                  Re-apply
                </Button>
                <Button onClick={handleSwitchToIndependent}>Switch to independent</Button>
              </div>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.03em]">Waiting for approval</h1>
              <p className="mt-3 text-bb-muted">
                Your account has been created, but your institution&apos;s administrator must approve your join request before you can access the library.
              </p>
              <p className="mt-5 rounded-xl bg-bb-warning-soft px-4 py-3 text-sm text-bb-warning-ink">
                You will receive an email once your account is ready.
              </p>
              <Button variant="outline" className="mt-8" onClick={() => window.location.reload()}>
                Refresh status
              </Button>
            </>
          )}
        </Card>
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
        overdue: daysLeft <= 0,
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


  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Student';
  const streak = overviewStats?.streak ?? 0;

  return (
    <div className="space-y-8 pb-4">
      <TrialExpirationBanner />

      {/* Self-serve AI free-trial CTA: only for B2C students without an active
          trial/paid plan (hook returns false otherwise, so this hides itself). */}
      {canStartTrial && <StartTrialButton variant="card" />}

      <PageHeader
        className="mb-0"
        eyebrow={institutionName ?? "Today's learning"}
        title={`${greeting}, ${firstName}.`}
        description="Pick up where you left off, listen while you commute, or ask Varta to clear your doubts."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/varta">
                <Icon name="varta" size={18} /> Ask Varta
              </Link>
            </Button>
            <Button asChild>
              <Link href="/catalog">
                Browse library <Icon name="arrow-right" size={18} />
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Books borrowed"
          value={overviewStats?.totalBooks ?? borrowedBooks.length}
          icon="library"
          loading={isDataLoading}
        />
        <StatCard
          title="Pages read"
          value={overviewStats?.totalPages ?? 0}
          icon="read"
          loading={isDataLoading}
        />
        <StatCard
          variant="featured"
          title="Reading streak"
          value={`${streak}d`}
          icon="streak"
          loading={isDataLoading}
        />
      </div>

      <Card className="rounded-[22px] p-5 sm:p-6">
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        <StudyStreamsGrid data={streamsData} isLoading={isDataLoading} />
        <div className="space-y-6">
          <UpcomingPanel items={upcomingItems} isLoading={isDataLoading} />
          <ActivityFeed items={activityItems} isLoading={isDataLoading} />
        </div>
      </div>
    </div>
  )
}

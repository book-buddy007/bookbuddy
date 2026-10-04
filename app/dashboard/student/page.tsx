"use client"

import { useState,useEffect } from "react"
import { useAuthStore } from "@/store/useAuthStore"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import apiClient from "@/lib/apiClient"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Icon } from "@/components/ui/icon"
import { TrialExpirationBanner } from "@/components/TrialExpirationBanner"
import { StartTrialButton,useCanStartTrial } from "@/components/subscription/StartTrialButton"
import { CardGrid } from "@/components/dashboard/cards/dash-card"
import { ContinueReadingCard,type ContinueReadingBook } from "@/components/dashboard/cards/continue-reading-card"
import { GoalRingCard } from "@/components/dashboard/cards/goal-ring-card"
import { StreakCard } from "@/components/dashboard/cards/streak-card"
import { AskVartaCard } from "@/components/dashboard/cards/ask-varta-card"
import { SanchikaCard,type ReviewConcept } from "@/components/dashboard/cards/sanchika-card"
import { NowListeningCard } from "@/components/dashboard/cards/now-listening-card"
import { AssignedCard,type DueItem } from "@/components/dashboard/cards/assigned-card"
import { WeeklyBarsCard,type WeekDay } from "@/components/dashboard/cards/weekly-bars-card"
import { LatestHighlightCard,type LatestHighlight } from "@/components/dashboard/cards/latest-highlight-card"

export default function StudentDashboard() {
  const { userProfile } = useUserProfile()

  // Dynamic Dashboard State
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([])
  const [overviewStats, setOverviewStats] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [goals, setGoals] = useState<any[]>([])
  const [reviewQueue, setReviewQueue] = useState<any[]>([])
  const [highlight, setHighlight] = useState<LatestHighlight | null>(null)
  const [isDataLoading, setIsDataLoading] = useState(true)

  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuthStore()

  // Fetch Dashboard Specific Data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthLoading && !isAuthenticated) return;
      setIsDataLoading(true);
      try {
        const [borrowedRes, overviewRes, historyRes, goalsRes, queueRes] = await Promise.all([
          apiClient.get('/library/borrowed').catch(() => ({ data: [] })),
          apiClient.get('/analytics/overview').catch(() => ({ data: { totalBooks: 0, totalPages: 0 } })),
          // Pages read per day for the last 7 days (today is the last entry).
          apiClient.get('/analytics/history').catch(() => ({ data: [] })),
          apiClient.get('/analytics/goals').catch(() => ({ data: [] })),
          // Concepts due for a quick revisit (the Sanchika card's flashcard stack).
          apiClient.get('/students/me/resurfacing-queue').catch(() => ({ data: [] })),
        ]);

        setBorrowedBooks(borrowedRes.data || []);
        setOverviewStats(overviewRes.data || null);
        setHistory(Array.isArray(historyRes.data) ? historyRes.data : []);
        setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
        setReviewQueue(Array.isArray(queueRes.data) ? queueRes.data.filter((q: any) => !q.actioned) : []);
      } catch (err) {
        console.error("Dashboard data fetch failed", err);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, isAuthLoading]);

  // The book the student read last: most recently opened, else the first one borrowed.
  const lastBook = [...borrowedBooks]
    .filter((b: any) => b.progress)
    .sort((a: any, b: any) => new Date(b.progress.lastReadAt).getTime() - new Date(a.progress.lastReadAt).getTime())[0] ?? borrowedBooks[0]
  const lastBookId: string | undefined = lastBook?.book?.id ?? lastBook?.bookId

  // Latest highlight from that book.
  useEffect(() => {
    if (!lastBookId) {
      setHighlight(null)
      return
    }
    let cancelled = false
    apiClient
      .get(`/annotations/book/${lastBookId}`)
      .then((res) => {
        const list: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? []
        const latest = list
          .filter((a) => a.type === 'highlight' && typeof a.content === 'string' && a.content.trim())
          .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0]
        if (!cancelled)
          setHighlight(
            latest
              ? { text: latest.content.trim(), bookId: lastBookId, bookTitle: lastBook?.book?.title, page: latest.position?.page ?? null }
              : null,
          )
      })
      .catch(() => !cancelled && setHighlight(null))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBookId])

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


  // ──────── Map API data → card props ────────

  const continueBook: ContinueReadingBook | null = lastBook
    ? {
        id: lastBookId as string,
        title: lastBook.book?.title || 'Untitled',
        author: lastBook.book?.author,
        coverUrl: lastBook.book?.coverUrl,
        subject: lastBook.book?.subject,
        percent: lastBook.progress?.percentComplete ?? 0,
        page: lastBook.progress?.currentPage > 0 ? lastBook.progress.currentPage : undefined,
        hasAudio: !!lastBook.book?.hasAudio,
      }
    : null;

  const weekDays: WeekDay[] = history.map((h: any, i: number) => ({
    label: h.date,
    pages: h.pages ?? 0,
    today: i === history.length - 1,
  }));
  const pagesToday = history.length ? history[history.length - 1].pages ?? 0 : 0;
  const minutesToday = overviewStats?.minutesReadToday ?? 0;
  const goalPages = goals.find((g: any) => g.type === 'pages')?.target ?? 50;
  const streak = overviewStats?.streak ?? 0;

  const reviewConcepts: ReviewConcept[] = reviewQueue.slice(0, 5).map((q: any) => ({
    id: q.id,
    label: q.conceptLabel,
    bookTitle: q.bookTitle,
    page: q.page,
  }));

  // Library due dates, soonest first.
  const dueItems: DueItem[] = borrowedBooks
    .filter((b: any) => b.dueDate)
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .map((b: any) => {
      const due = new Date(b.dueDate);
      const daysLeft = Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return {
        id: b.id,
        title: `Return: ${b.book?.title || 'Book'}`,
        by: daysLeft <= 0 ? 'Please return it to the library' : `Due ${due.toLocaleDateString()}`,
        due:
          daysLeft < 0
            ? 'Overdue'
            : daysLeft === 0
              ? 'Today'
              : daysLeft === 1
                ? 'Tomorrow'
                : daysLeft < 7
                  ? due.toLocaleDateString('en-US', { weekday: 'short' })
                  : due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        urgent: daysLeft <= 3,
        icon: 'book-open' as const,
        href: `/reader?bookId=${b.book?.id ?? b.bookId}`,
      };
    });

  // Institution name for greeting pill
  const activeMembership = userProfile?.memberships?.find((m: any) => m.status === 'ACTIVE');
  const institutionName = activeMembership?.tenantName;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Student';

  return (
    <div className="space-y-6 pb-4">
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
            <Button asChild variant="soft">
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

      <CardGrid>
        <ContinueReadingCard book={continueBook} loading={isDataLoading} index={0} />
        <GoalRingCard pagesToday={pagesToday} goalPages={goalPages} minutesToday={minutesToday} loading={isDataLoading} index={1} />
        <StreakCard streak={streak} readToday={minutesToday > 0 || pagesToday > 0} loading={isDataLoading} index={2} />
        <AskVartaCard bookId={lastBookId} index={3} />
        <SanchikaCard
          due={reviewConcepts}
          highlights={overviewStats?.highlights ?? 0}
          flashcards={overviewStats?.flashcards ?? 0}
          explanations={overviewStats?.explanations ?? 0}
          loading={isDataLoading}
          index={4}
        />
        <NowListeningCard index={5} />
        <AssignedCard items={dueItems} loading={isDataLoading} index={6} />
        <WeeklyBarsCard days={weekDays} loading={isDataLoading} index={7} />
        <LatestHighlightCard highlight={highlight} loading={isDataLoading} index={8} />
      </CardGrid>
    </div>
  )
}

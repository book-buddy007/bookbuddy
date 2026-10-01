"use client"

import * as React from "react"
import Link from "next/link"
import { Icon } from "@/components/ui/icon"
import { StatCard } from "@/components/ui/stat-card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { StatusBadge } from "@/components/ui/status-badge"
import { timeAgo, type Labelled, type VartaActivity } from "@/components/varta/use-varta-data"

const MODE_LABEL: Record<string, string> = { explain: "Explain", socratic: "Socratic", debate: "Debate", quiz_me: "Quiz me" }

const Card = ({ title, icon, children }: { title: string; icon?: React.ComponentProps<typeof Icon>["name"]; children: React.ReactNode }) => (
  <section className="rounded-bb-lg bg-bb-surface p-6 shadow-e1">
    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
      {icon && <Icon name={icon} size={20} />}
      {title}
    </h2>
    {children}
  </section>
)

function MasteryList({ title, items }: { title: string; items: Labelled[] }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.1em] text-bb-faint">{title}</h3>
      <ul className="space-y-3">
        {items.map((m, i) => (
          <li key={i}>
            <div className="mb-1 flex justify-between text-[13px]">
              <span className="truncate pr-2 font-medium">{m.label}</span>
              <span className="text-bb-muted">{Math.round(m.mastery * 100)}%</span>
            </div>
            <Progress value={Math.round(m.mastery * 100)} className="h-1.5" />
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The student's Varta activity dashboard (stats, usage, recent chats and quizzes, mastery). */
export function VartaActivityView({ data, loading, error, bookId }: { data: VartaActivity | null; loading: boolean; error: string | null; bookId?: string }) {
  const maxUsage = React.useMemo(() => Math.max(1, ...(data?.usage.series.map((s) => s.varta + s.quiz) ?? [1])), [data])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <StatCard key={i} loading title="" value="" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-bb-lg" />
      </div>
    )
  }
  if (error || !data) return <EmptyState icon="alert" title={error ?? "No data"} description="Try again in a moment." />

  const { stats, usage, recentChats, recentQuizzes } = data
  const accuracy = stats.quiz.accuracy != null ? `${Math.round(stats.quiz.accuracy * 100)}%` : "—"
  const mastery = stats.mastery.average != null ? `${Math.round(stats.mastery.average * 100)}%` : "—"
  const totalModes = Object.values(stats.modeBreakdown).reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-6">
      {usage.trial.isTrial && usage.trial.remaining && (
        <div className="flex items-center gap-3 rounded-2xl bg-bb-warning-soft px-4 py-3 text-sm text-bb-warning-ink">
          <Icon name="sparkles" size={20} />
          <span>
            Free trial — today you have <b>{usage.trial.remaining.varta}</b> Varta and <b>{usage.trial.remaining.quiz}</b> quiz questions left (of{" "}
            {usage.trial.remaining.limit} each).
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard variant="featured" icon="chat" title="Questions asked" value={stats.questionsAsked} />
        <StatCard icon="assignment" title="Quiz questions" value={stats.quiz.answered} description={`${stats.quiz.correct} correct`} />
        <StatCard icon="goals" title="Quiz accuracy" value={accuracy} />
        <StatCard icon="varta" title="Avg. mastery" value={mastery} description={`${stats.mastery.tracked} concepts`} />
      </div>

      <Card title="Usage · last 30 days" icon="analytics">
        <div className="mb-3 flex items-center gap-4 text-xs text-bb-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-bb-cobalt-light" /> Varta</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-bb-accent" /> Quiz</span>
        </div>
        <div className="flex h-28 items-end gap-[3px]">
          {usage.series.map((s) => {
            const total = s.varta + s.quiz
            const h = (total / maxUsage) * 100
            const vH = total > 0 ? (s.varta / total) * 100 : 0
            return (
              <div key={s.date} className="flex flex-1 flex-col justify-end" title={`${s.date}: ${s.varta} varta, ${s.quiz} quiz`}>
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-t-sm" style={{ height: `${Math.max(h, total > 0 ? 6 : 2)}%` }}>
                  <div className="bg-bb-cobalt-light" style={{ height: `${vH}%` }} />
                  <div className="bg-bb-accent" style={{ height: `${100 - vH}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recent conversations" icon="chat">
          {recentChats.length === 0 ? (
            <p className="py-6 text-center text-sm text-bb-muted">No Varta questions yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentChats.map((c, i) => (
                <li key={i}>
                  <Link href={`/varta?bookId=${c.bookId}`} className="block rounded-xl border border-bb-border p-3 transition-colors hover:bg-bb-hover focus-visible:outline-none focus-visible:shadow-focus">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.08em] text-bb-accent-ink">{MODE_LABEL[c.mode] ?? c.mode}</span>
                      <span className="text-xs text-bb-faint">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="line-clamp-2 text-sm">{c.preview}</p>
                    {data.scope === "global" && <p className="mt-1 text-xs text-bb-muted">{c.bookTitle}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent quiz answers" icon="assignment">
          {recentQuizzes.length === 0 ? (
            <p className="py-6 text-center text-sm text-bb-muted">No quiz attempts yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentQuizzes.map((q, i) => (
                <li key={i} className="flex items-start gap-3 rounded-xl border border-bb-border p-3">
                  <StatusBadge status={q.correct ? "returned" : "overdue"} label={q.correct ? "Correct" : "Missed"} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm">{q.prompt}</p>
                    <p className="mt-1 text-xs text-bb-muted">
                      {data.scope === "global" && <>{q.bookTitle} · </>}
                      {q.chapterTitle}
                      {q.citedPage != null ? ` · pg. ${q.citedPage}` : ""} · {timeAgo(q.answeredAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Concept mastery" icon="goals">
          {stats.mastery.tracked === 0 ? (
            <p className="py-6 text-center text-sm text-bb-muted">Answer some quizzes to build mastery.</p>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <MasteryList title="Strongest" items={stats.mastery.strongest} />
              <MasteryList title="Needs work" items={stats.mastery.weakest} />
            </div>
          )}
        </Card>

        <Card title="How you use Varta" icon="analytics">
          {totalModes === 0 ? (
            <p className="py-6 text-center text-sm text-bb-muted">No conversations yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.modeBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([mode, count]) => (
                  <div key={mode}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="font-medium">{MODE_LABEL[mode] ?? mode}</span>
                      <span className="text-bb-muted">{count}</span>
                    </div>
                    <Progress value={(count / totalModes) * 100} />
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
      {bookId && (
        <p className="text-center text-sm text-bb-muted">
          Showing this book only.{" "}
          <Link href="/varta?view=activity" className="font-semibold text-bb-accent-ink hover:underline">
            See all books
          </Link>
        </p>
      )}
    </div>
  )
}

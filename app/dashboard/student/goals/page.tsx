'use client';

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

const EMPTY_GOAL = {
  title: "",
  type: "books",
  target: "",
  deadline: new Date(),
  category: "General",
  notes: "",
};

const ACHIEVEMENT_ICON: Record<string, BBIconName> = {
  book: "read",
  clock: "calendar",
  graduation: "goals",
};

export default function GoalsPage() {
  const { isAuthenticated } = useAuthStore();
  const [timeframe, setTimeframe] = useState("monthly");
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({ ...EMPTY_GOAL });

  const [isLoading, setIsLoading] = useState(true);
  const [readingStats, setReadingStats] = useState({
    totalBooks: 0,
    totalPages: 0,
    readingTimeHours: 0,
    streak: 0,
  });
  const [currentGoals, setCurrentGoals] = useState<any[]>([]);
  const [readingHistory, setReadingHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const [overviewRes, goalsRes, historyRes] = await Promise.all([
          apiClient.get('/analytics/overview').catch(() => ({ data: { totalBooks: 0, totalPages: 0, readingTimeHours: 0, streak: 0 } })),
          apiClient.get('/analytics/goals').catch(() => ({ data: [] })),
          apiClient.get('/analytics/history').catch(() => ({ data: [] }))
        ]);

        if (overviewRes.data) setReadingStats(overviewRes.data);
        if (goalsRes.data) setCurrentGoals(goalsRes.data);
        if (historyRes.data) setReadingHistory(historyRes.data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [isAuthenticated]);

  const achievements = [
    {
      id: "A1",
      title: "Bookworm",
      description: "Read 10 books in a month",
      icon: "book",
      unlocked: true,
      date: "2024-02-15",
    },
    {
      id: "A2",
      title: "Speed Reader",
      description: "Read 100 pages in one sitting",
      icon: "clock",
      unlocked: true,
      date: "2024-02-20",
    },
    {
      id: "A3",
      title: "Scholar",
      description: "Complete all course readings",
      icon: "graduation",
      unlocked: false,
      date: null,
    },
  ];

  // Rendered inline (not as an inner component) so typing doesn't remount the inputs.
  const goalForm = (
    <form className="space-y-4">
      <FormField label="Goal title" htmlFor="title">
        <Input
          id="title"
          placeholder="e.g., Read 5 books this month"
          value={newGoal.title}
          onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Goal type" htmlFor="type">
          <Select value={newGoal.type} onValueChange={(value) => setNewGoal({ ...newGoal, type: value })}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="books">Number of books</SelectItem>
              <SelectItem value="pages">Number of pages</SelectItem>
              <SelectItem value="time">Reading time</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Target" htmlFor="target">
          <Input
            id="target"
            type="number"
            placeholder={newGoal.type === "books" ? "Number of books" : "Number of pages"}
            value={newGoal.target}
            onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category" htmlFor="category">
          <Select value={newGoal.category} onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="Personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Deadline">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Icon name="calendar" size={18} />
                {newGoal.deadline ? format(newGoal.deadline, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={newGoal.deadline}
                onSelect={(date) => date && setNewGoal({ ...newGoal, deadline: date })}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </FormField>
      </div>

      <FormField label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          placeholder="Add any additional details about your goal..."
          value={newGoal.notes}
          onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
        />
      </FormField>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => setShowNewGoalDialog(false)} type="button">
          Cancel
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            // Here you would typically make an API call to save the goal
            console.log("New goal:", newGoal);
            setShowNewGoalDialog(false);
            setNewGoal({ ...EMPTY_GOAL, deadline: new Date() });
          }}
          type="submit"
        >
          Create goal
        </Button>
      </div>
    </form>
  );

  const maxPages = Math.max(50, ...readingHistory.map((d) => d.pages || 0));

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Student"
        title="Reading goals"
        description="Track your reading progress and achievements."
        actions={
          <>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">This week</SelectItem>
                <SelectItem value="monthly">This month</SelectItem>
                <SelectItem value="yearly">This year</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Icon name="plus" size={18} /> New goal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create new reading goal</DialogTitle>
                  <DialogDescription>Set a new reading goal to track your progress</DialogDescription>
                </DialogHeader>
                {goalForm}
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          variant="featured"
          title="Books read"
          value={readingStats.totalBooks}
          icon="library"
          loading={isLoading}
        />
        <StatCard title="Pages read" value={readingStats.totalPages} icon="read" loading={isLoading} />
        <StatCard
          title="Reading time"
          value={`${readingStats.readingTimeHours || 0}h`}
          icon="calendar"
          loading={isLoading}
        />
        <StatCard
          title="Current streak"
          value={`${readingStats.streak} days`}
          description="Keep it up!"
          icon="streak"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Current goals</h2>
            <p className="text-[13px] text-bb-muted">Track your progress towards your reading goals</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 rounded-[18px]" />
              ))}
            </div>
          ) : currentGoals.length === 0 ? (
            <EmptyState
              icon="goals"
              title="No active goals yet"
              description="Set a goal for books, pages or reading time and watch your progress here."
              action={
                <Button onClick={() => setShowNewGoalDialog(true)}>
                  <Icon name="plus" size={18} /> New goal
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {currentGoals.map((goal) => {
                const pct = goal.target ? Math.min(100, Math.round((goal.progress / goal.target) * 100)) : 0;
                return (
                  <article key={goal.id} className="rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-bb-muted">
                          <Icon name="calendar" size={14} /> Due {new Date(goal.deadline).toLocaleDateString()}
                        </p>
                      </div>
                      <Chip>{goal.category}</Chip>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Progress value={pct} className="flex-1" />
                      <span className="text-sm font-bold tabular-nums">{pct}%</span>
                    </div>
                    <p className="mt-1.5 text-[13px] text-bb-muted">
                      {goal.progress} of {goal.target} {goal.type === "books" ? "books" : "pages"}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Achievements</h2>
            <p className="text-[13px] text-bb-muted">Your reading accomplishments and badges</p>
          </div>
          <div className="space-y-3">
            {achievements.map((a) => (
              <article
                key={a.id}
                className={`flex items-start gap-4 rounded-[18px] p-4 sm:p-5 ${
                  a.unlocked ? "bg-bb-surface shadow-e1" : "bg-bb-surface-2"
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    a.unlocked ? "bg-bb-accent-soft" : "bg-bb-surface"
                  }`}
                >
                  <Icon
                    name={a.unlocked ? ACHIEVEMENT_ICON[a.icon] ?? "star" : "lock"}
                    size={24}
                    className={a.unlocked ? undefined : "opacity-50"}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={`font-semibold ${a.unlocked ? "" : "text-bb-muted"}`}>{a.title}</h3>
                    {a.unlocked && <Chip selected>Unlocked</Chip>}
                  </div>
                  <p className="mt-0.5 text-sm text-bb-muted">{a.description}</p>
                  {a.unlocked && a.date && (
                    <p className="mt-1.5 text-xs font-semibold text-bb-accent-ink">
                      Unlocked on {new Date(a.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Reading history</h2>
          <p className="text-[13px] text-bb-muted">Your reading activity over time</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-[22px] bg-bb-surface p-5 shadow-e1">
            <h3 className="mb-4 text-sm font-semibold">Pages read</h3>
            <div className="flex h-[200px] items-end justify-between gap-1">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : readingHistory.length === 0 ? (
                <p className="m-auto text-sm text-bb-muted">No reading activity yet.</p>
              ) : (
                readingHistory.map((day, index) => (
                  <div key={index} className="flex h-full w-full flex-col items-center justify-end">
                    <div
                      title={`${day.pages || 0} pages`}
                      className="w-[60%] rounded-t-md bg-bb-navy sm:w-8"
                      style={{ height: `${Math.max(2, ((day.pages || 0) / maxPages) * 100)}%` }}
                    />
                    <span className="mt-2 text-xs font-medium text-bb-muted">{day.date}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center justify-center rounded-[22px] bg-bb-surface p-5 text-center shadow-e1 md:col-span-2">
            <p className="max-w-sm text-sm text-bb-muted">
              Detailed insights are still compiling from your reading sources. Keep reading to unlock detailed metrics.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

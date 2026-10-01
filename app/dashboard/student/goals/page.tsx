'use client';

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/apiClient";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Trophy,
  Target,
  Calendar as CalendarIcon,
  Clock,
  Star,
  BookMarked,
  Award,
  ChevronRight,
  ChevronDown,
  TrendingUp
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import adminStyles from "@/app/admin.module.css";

export default function GoalsPage() {
  const { isAuthenticated } = useAuthStore();
  const [timeframe, setTimeframe] = useState("monthly");
  const [showNewGoalDialog, setShowNewGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    type: "books",
    target: "",
    deadline: new Date(),
    category: "General",
    notes: "",
  });

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

  const GoalCreationForm = () => (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Goal Title</Label>
        <Input
          id="title"
          placeholder="e.g., Read 5 books this month"
          value={newGoal.title}
          onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Goal Type</Label>
          <Select
            value={newGoal.type}
            onValueChange={(value) => setNewGoal({ ...newGoal, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="books">Number of Books</SelectItem>
              <SelectItem value="pages">Number of Pages</SelectItem>
              <SelectItem value="time">Reading Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="target">Target</Label>
          <Input
            id="target"
            type="number"
            placeholder={newGoal.type === "books" ? "Number of books" : "Number of pages"}
            value={newGoal.target}
            onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={newGoal.category}
            onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="General">General</SelectItem>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="Personal">Personal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Deadline</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
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
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Add any additional details about your goal..."
          value={newGoal.notes}
          onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setShowNewGoalDialog(false)}
          type="button"
        >
          Cancel
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            // Here you would typically make an API call to save the goal
            console.log("New goal:", newGoal);
            setShowNewGoalDialog(false);
            setNewGoal({
              title: "",
              type: "books",
              target: "",
              deadline: new Date(),
              category: "General",
              notes: "",
            });
          }}
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Create Goal
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
            <Target className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            Reading Goals & Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Track your reading progress and achievements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[180px] border-indigo-200 focus:border-indigo-500">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">This Week</SelectItem>
              <SelectItem value="monthly">This Month</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showNewGoalDialog} onOpenChange={setShowNewGoalDialog}>
            <DialogTrigger asChild>
              <EnhancedButton
                className="shadow-lg border-transparent"
                icon={<Target className="h-4 w-4" />}
              >
                New Goal
              </EnhancedButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Reading Goal</DialogTitle>
                <DialogDescription>
                  Set a new reading goal to track your progress
                </DialogDescription>
              </DialogHeader>
              <GoalCreationForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <StatCard
          title="Books Read"
          value={readingStats.totalBooks.toString()}
          description="+2 from last month"
          icon={BookOpen}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
          variant="primary"
          trend="up"
        />
        <StatCard
          title="Pages Read"
          value={readingStats.totalPages.toString()}
          description="+456 from last month"
          icon={BookMarked}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-900/20"
          variant="success"
          trend="up"
        />
        <StatCard
          title="Reading Time"
          value={readingStats.readingTimeHours ? `${readingStats.readingTimeHours}h` : "0h"}
          description="+0h from last month"
          icon={Clock}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          variant="info"
          trend="up"
        />
        <StatCard
          title="Current Streak"
          value={`${readingStats.streak} days`}
          description="Keep it up!"
          icon={Star}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-900/20"
          variant="warning"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
          <div className={adminStyles.archMotif} />
          <EnhancedCardHeader className="relative z-10 pb-2">
            <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
              <Trophy className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Current Goals
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-slate-600 dark:text-slate-400">
              Track your progress towards your reading goals
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent className="relative z-10">
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-6 text-slate-500">Loading goals...</div>
              ) : currentGoals.length === 0 ? (
                <div className="text-center py-6 text-slate-500">No active goals found. Set one up!</div>
              ) : currentGoals.map((goal) => (
                <div key={goal.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200">{goal.title}</h4>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <CalendarIcon className="h-3 w-3" /> Due: {new Date(goal.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                      {goal.category}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-600 dark:text-slate-400">{goal.progress} of {goal.target} {goal.type === "books" ? "books" : "pages"}</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{Math.min(100, Math.round((goal.progress / goal.target) * 100))}%</span>
                    </div>
                    <Progress value={Math.min(100, (goal.progress / goal.target) * 100)} className="h-2 bg-indigo-100 dark:bg-indigo-900/30" />
                  </div>
                </div>
              ))}
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
          <div className={adminStyles.archMotif} />
          <EnhancedCardHeader className="relative z-10 pb-2">
            <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
              <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Achievements
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-slate-600 dark:text-slate-400">
              Your reading accomplishments and badges
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent className="relative z-10">
            <div className="space-y-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${!achievement.unlocked
                    ? "opacity-60 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                    : "border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-900 shadow-sm"
                    }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${achievement.unlocked ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-slate-100 dark:bg-slate-800"
                    }`}>
                    <Award className={`h-6 w-6 ${achievement.unlocked ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className={`font-semibold ${achievement.unlocked ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>
                        {achievement.title}
                      </h4>
                      {achievement.unlocked && (
                        <Badge variant="default" className="bg-indigo-600 text-white border-transparent">Unlocked</Badge>
                      )}
                    </div>
                    <p className={`text-sm mt-0.5 ${achievement.unlocked ? "text-slate-600 dark:text-slate-400" : "text-slate-400 dark:text-slate-500"}`}>
                      {achievement.description}
                    </p>
                    {achievement.unlocked && achievement.date && (
                      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1.5 font-medium">
                        Unlocked on {new Date(achievement.date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>

      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
            <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Reading History
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-600 dark:text-slate-400">
            Your reading activity over time
          </EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <EnhancedCard variant="outline" className="border-indigo-100 dark:border-indigo-900/30">
                <EnhancedCardHeader className="pb-2">
                  <EnhancedCardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pages Read</EnhancedCardTitle>
                </EnhancedCardHeader>
                <EnhancedCardContent>
                  <div className="h-[200px] relative">
                    <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between h-full">
                      {isLoading ? (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">Loading Chart...</div>
                      ) : readingHistory.map((day, index) => {
                        // Dynamically scale based on max pages. Assuming 50 pages is average scale if low volume.
                        const maxPages = Math.max(50, ...readingHistory.map(d => d.pages || 0));
                        return (
                          <div key={index} className="flex flex-col items-center w-full">
                            <div
                              className="w-[60%] sm:w-8 bg-indigo-500 dark:bg-indigo-600 rounded-t-sm transition-all hover:bg-indigo-600"
                              style={{ height: `${Math.max(2, ((day.pages || 0) / maxPages) * 100)}%` }}
                            />
                            <span className="text-xs mt-2 text-slate-500 font-medium">{day.date}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </EnhancedCardContent>
              </EnhancedCard>

              <EnhancedCard variant="outline" className="border-emerald-100 dark:border-emerald-900/30 md:col-span-2">
                <EnhancedCardHeader className="pb-2">
                  <EnhancedCardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">Aggregated View</EnhancedCardTitle>
                </EnhancedCardHeader>
                <EnhancedCardContent>
                  <div className="h-[200px] flex items-center justify-center text-slate-500">
                    Detailed insights currently compiling from reading sources. Keep reading to unlock detailed metrics!
                  </div>
                </EnhancedCardContent>
              </EnhancedCard>
            </div>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
  );
}
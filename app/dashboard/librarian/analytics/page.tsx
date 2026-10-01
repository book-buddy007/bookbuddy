import React from "react";
import { Metadata } from "next";
import { Chip } from "@/components/ui/chip";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BorrowersChart,
  CategoriesChart,
  CirculationTrendsChart,
} from "@/components/librarian/analytics-charts";

export const metadata: Metadata = {
  title: "Analytics | Librarian Dashboard",
  description: "Library usage statistics and data analysis",
};

// Sample data for charts and statistics. There is no librarian analytics endpoint yet.
const mockOverviewStats: { title: string; value: string; change: string; trend: "up" | "down"; icon: BBIconName }[] = [
  { title: "Total checkouts", value: "2,851", change: "+12.5%", trend: "up", icon: "read" },
  { title: "Active borrowers", value: "487", change: "+4.2%", trend: "up", icon: "class" },
  { title: "Overdue items", value: "32", change: "-8.1%", trend: "down", icon: "overdue" },
  { title: "New acquisitions", value: "156", change: "+24.3%", trend: "up", icon: "library" },
];

const mockPopularCategories = [
  { category: "Fiction", count: 856, percentage: 30 },
  { category: "Science & Technology", count: 542, percentage: 19 },
  { category: "History", count: 389, percentage: 14 },
  { category: "Biography", count: 287, percentage: 10 },
  { category: "Art & Design", count: 245, percentage: 9 },
  { category: "Others", count: 532, percentage: 18 },
];

const mockBorrowerTypes = [
  { type: "Undergraduate Students", count: 1245, percentage: 48 },
  { type: "Graduate Students", count: 723, percentage: 28 },
  { type: "Faculty", count: 386, percentage: 15 },
  { type: "Staff", count: 158, percentage: 6 },
  { type: "External Members", count: 84, percentage: 3 },
];

const mockTrends = [
  { week: "W1", checkouts: 182, returns: 160 },
  { week: "W2", checkouts: 205, returns: 178 },
  { week: "W3", checkouts: 231, returns: 214 },
  { week: "W4", checkouts: 219, returns: 226 },
  { week: "W5", checkouts: 248, returns: 231 },
  { week: "W6", checkouts: 262, returns: 244 },
];

const insights: { icon: BBIconName; title: string; body: string }[] = [
  { icon: "read", title: "Fiction dominates borrowing", body: "Fiction represents 30% of all checkouts, with mystery and thriller sub-genres being the most popular." },
  { icon: "class", title: "Undergraduate usage increased", body: "Undergraduate student borrowing has increased by 15% compared to the previous semester." },
  { icon: "audiobook", title: "Digital resources adoption", body: "E-book and digital resource usage has increased by 28% in the past quarter." },
];

const Panel = ({ title, description, children, className }: { title: string; description: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6 ${className ?? ""}`}>
    <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{title}</h3>
    <p className="mb-4 text-[13px] text-bb-muted">{description}</p>
    {children}
  </section>
);

const AnalyticsPage = () => {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Analytics"
        description="Library usage statistics and data analysis."
        actions={
          <>
            <Chip icon="info">Sample data</Chip>
            <Select defaultValue="30">
              <SelectTrigger className="w-[170px]" aria-label="Time range">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockOverviewStats.map((stat, i) => (
          <StatCard
            key={stat.title}
            variant={i === 0 ? "featured" : "default"}
            title={stat.title}
            value={stat.value}
            description={`${stat.change} from last month`}
            icon={stat.icon}
            trend={stat.trend}
            trendValue={stat.change}
          />
        ))}
      </div>

      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="circulation">Circulation</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="borrowers">Borrowers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Circulation trends" description="Checkouts and returns over time">
              <CirculationTrendsChart data={mockTrends} />
            </Panel>
            <Panel title="Popular categories" description="Most borrowed categories">
              <CategoriesChart data={mockPopularCategories} />
            </Panel>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Borrower types" description="Distribution of borrower categories">
              <BorrowersChart data={mockBorrowerTypes} />
            </Panel>

            <Panel title="Key insights" description="Important trends and observations" className="lg:col-span-2">
              <div className="space-y-5">
                {insights.map((insight) => (
                  <div key={insight.title} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-bb-accent-soft">
                      <Icon name={insight.icon} size={20} />
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold">{insight.title}</h4>
                      <p className="text-sm text-bb-muted">{insight.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="circulation" className="mt-0">
          <Panel title="Circulation statistics" description="Checkouts and returns by week">
            <CirculationTrendsChart data={mockTrends} />
          </Panel>
        </TabsContent>

        <TabsContent value="collection" className="mt-0">
          <Panel title="Collection analysis" description="Checkouts by category">
            <div className="space-y-4">
              {mockPopularCategories.map((c) => (
                <div key={c.category}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-semibold">{c.category}</span>
                    <span className="text-bb-muted tabular-nums">{c.count} checkouts · {c.percentage}%</span>
                  </div>
                  <Progress value={c.percentage} />
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="borrowers" className="mt-0">
          <Panel title="Borrower analytics" description="Patron usage patterns and demographics">
            <div className="grid gap-6 md:grid-cols-2 md:items-center">
              <BorrowersChart data={mockBorrowerTypes} />
              <div className="space-y-4">
                {mockBorrowerTypes.map((b) => (
                  <div key={b.type}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold">{b.type}</span>
                      <span className="text-bb-muted tabular-nums">{b.count.toLocaleString()} checkouts</span>
                    </div>
                    <Progress value={b.percentage} />
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;

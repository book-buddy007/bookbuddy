'use client';

import { useState, useEffect } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { Chip } from "@/components/ui/chip";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Sample data for analytics. There is no admin analytics endpoint behind this page yet.
const mockBorrowingTrends = [
  { month: "Jan", physical: 145, ebook: 82, audiobook: 37 },
  { month: "Feb", physical: 158, ebook: 97, audiobook: 42 },
  { month: "Mar", physical: 172, ebook: 105, audiobook: 48 },
  { month: "Apr", physical: 138, ebook: 112, audiobook: 51 },
  { month: "May", physical: 152, ebook: 127, audiobook: 59 },
  { month: "Jun", physical: 124, ebook: 135, audiobook: 64 },
];

const mockOverdueStats = [
  { name: "On time", value: 78 },
  { name: "1-3 days late", value: 12 },
  { name: "4-7 days late", value: 6 },
  { name: "8+ days late", value: 4 },
];

const mockUserEngagement = [
  { day: "Mon", visitors: 243, actions: 452 },
  { day: "Tue", visitors: 278, actions: 512 },
  { day: "Wed", visitors: 296, actions: 538 },
  { day: "Thu", visitors: 287, actions: 501 },
  { day: "Fri", visitors: 268, actions: 473 },
  { day: "Sat", visitors: 187, actions: 318 },
  { day: "Sun", visitors: 152, actions: 286 },
];

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const engagementConfig = {
  actions: { label: "Actions", color: "hsl(var(--chart-1))" },
  visitors: { label: "Visitors", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const borrowingConfig = {
  physical: { label: "Physical", color: "hsl(var(--chart-3))" },
  ebook: { label: "E-books", color: "hsl(var(--chart-1))" },
  audiobook: { label: "Audiobooks", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

// Orange is the highlight series: use it for the worst band only.
const overdueColors = ["hsl(var(--chart-1))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--chart-2))"];

const StatTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-bb-surface-2 p-4">
    <div className="text-[13px] text-bb-muted">{label}</div>
    <div className="font-display text-xl font-extrabold tracking-[-0.02em]">{value}</div>
  </div>
);

const ChartSection = ({ title, children, tiles }: { title: string; children: React.ReactNode; tiles: [string, string][] }) => (
  <section className="space-y-5 rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6">
    <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{title}</h3>
    {children}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {tiles.map(([label, value]) => (
        <StatTile key={label} label={label} value={value} />
      ))}
    </div>
  </section>
);

export default function AdminAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("week");

  // Simulate loading data from API
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const totals = {
    physical: sum(mockBorrowingTrends.map((m) => m.physical)),
    ebook: sum(mockBorrowingTrends.map((m) => m.ebook)),
    audiobook: sum(mockBorrowingTrends.map((m) => m.audiobook)),
  };
  const avgVisitors = Math.round(sum(mockUserEngagement.map((d) => d.visitors)) / mockUserEngagement.length);
  const busiest = [...mockUserEngagement].sort((a, b) => b.actions - a.actions)[0].day;

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Analytics & insights"
        description="Track library usage, borrowing trends, and user engagement."
        actions={
          <>
            <Chip icon="info">Sample data</Chip>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40" aria-label="Time range">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
                <SelectItem value="quarter">This quarter</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          variant="featured"
          title="Total checkouts"
          value="2,874"
          description={`+12% from previous ${timeRange}`}
          icon="library"
          trend="up"
          trendValue="+12%"
          loading={isLoading}
        />
        <StatCard
          title="Active users"
          value="843"
          description={`+5% from previous ${timeRange}`}
          icon="class"
          trend="up"
          trendValue="+5%"
          loading={isLoading}
        />
        <StatCard
          title="Overdue items"
          value="37"
          description={`-8% from previous ${timeRange}`}
          icon="overdue"
          trend="down"
          trendValue="-8%"
          loading={isLoading}
        />
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-[22px]" />
      ) : (
        <Tabs defaultValue="engagement" className="space-y-6">
          <TabsList>
            <TabsTrigger value="engagement">User engagement</TabsTrigger>
            <TabsTrigger value="borrowing">Borrowing trends</TabsTrigger>
            <TabsTrigger value="overdue">Return compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="mt-0">
            <ChartSection
              title="Daily user activity"
              tiles={[
                ["Avg. daily visitors", String(avgVisitors)],
                ["Avg. actions/user", "1.8"],
                ["Busiest day", busiest],
                ["Peak hour", "2-3 PM"],
              ]}
            >
              <ChartContainer config={engagementConfig} className="h-72 w-full">
                <BarChart data={mockUserEngagement} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="actions" fill="var(--color-actions)" radius={[9, 9, 0, 0]} />
                  <Bar dataKey="visitors" fill="var(--color-visitors)" radius={[9, 9, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </ChartSection>
          </TabsContent>

          <TabsContent value="borrowing" className="mt-0">
            <ChartSection
              title="Material borrowing by type"
              tiles={[
                ["Physical books", String(totals.physical)],
                ["E-books", String(totals.ebook)],
                ["Audiobooks", String(totals.audiobook)],
                ["Growth", "+8.4%"],
              ]}
            >
              <ChartContainer config={borrowingConfig} className="h-72 w-full">
                <LineChart data={mockBorrowingTrends} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={36} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line dataKey="physical" type="monotone" stroke="var(--color-physical)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line dataKey="ebook" type="monotone" stroke="var(--color-ebook)" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line dataKey="audiobook" type="monotone" stroke="var(--color-audiobook)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ChartContainer>
            </ChartSection>
          </TabsContent>

          <TabsContent value="overdue" className="mt-0">
            <ChartSection
              title="Return compliance rate"
              tiles={[
                ["Compliance rate", "78%"],
                ["Avg. overdue days", "2.3"],
                ["Total fines", "$349.50"],
                ["Collected", "$287.25"],
              ]}
            >
              <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
                <ChartContainer config={{}} className="h-56 w-56">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie data={mockOverdueStats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} strokeWidth={2}>
                      {mockOverdueStats.map((_, i) => (
                        <Cell key={i} fill={overdueColors[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="space-y-2">
                  {mockOverdueStats.map((item, i) => (
                    <li key={item.name} className="flex items-center gap-2 text-sm">
                      <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: overdueColors[i] }} />
                      {item.name}: <span className="font-semibold tabular-nums">{item.value}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ChartSection>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

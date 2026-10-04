'use client';

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { NoInstitution } from "@/components/admin/NoInstitution";
import { useAdminTenant } from "@/hooks/use-admin-tenant";
import { useAdminAnalytics } from "@/hooks/use-admin-data";
import type { AnalyticsRange } from "@/lib/tenant-admin";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const nf = new Intl.NumberFormat();

const RANGE_LABEL: Record<AnalyticsRange, string> = {
  day: "the last 24 hours",
  week: "the last 7 days",
  month: "the last 30 days",
  quarter: "the last 13 weeks",
  year: "the last 12 months",
};

const engagementConfig = {
  pages: { label: "Pages read (avg.)", color: "hsl(var(--chart-1))" },
  readers: { label: "Readers (avg.)", color: "hsl(var(--chart-3))" },
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
  const [timeRange, setTimeRange] = useState<AnalyticsRange>("week");
  const { tenantId, loading: tenantLoading } = useAdminTenant();
  const { data, isLoading, isError, error, refetch } = useAdminAnalytics(timeRange);

  const header = (
    <PageHeader
      className="mb-0"
      eyebrow="Admin"
      title="Analytics & insights"
      description="Track library usage, borrowing trends, and reading activity."
      actions={
        <Select value={timeRange} onValueChange={(v) => setTimeRange(v as AnalyticsRange)}>
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
      }
    />
  );

  if (!tenantLoading && !tenantId) {
    return (
      <div className="space-y-8">
        {header}
        <NoInstitution />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        {header}
        <EmptyState
          icon="alert-circle"
          title="Couldn't load analytics"
          description={(error as Error)?.message}
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
        />
      </div>
    );
  }

  const loading = tenantLoading || isLoading || !data;

  // Everything below only runs once `data` is present.
  const trends = data?.borrowingTrends ?? [];
  const totals = {
    physical: sum(trends.map((m) => m.physical)),
    ebook: sum(trends.map((m) => m.ebook)),
    audiobook: sum(trends.map((m) => m.audiobook)),
  };
  const engagement = data?.engagement ?? [];
  const avgReaders = engagement.length ? sum(engagement.map((d) => d.readers)) / engagement.length : 0;
  const avgPages = engagement.length ? sum(engagement.map((d) => d.pages)) / engagement.length : 0;
  const busiest = [...engagement].sort((a, b) => b.readers - a.readers || b.pages - a.pages)[0];
  const hasEngagement = engagement.some((d) => d.readers > 0 || d.pages > 0);

  const distribution = data?.overdueDistribution ?? [];
  const dueTotal = sum(distribution.map((d) => d.value));
  const lateTotal = dueTotal - (distribution[0]?.value ?? 0);
  const onTimeRate = dueTotal ? Math.round(((distribution[0]?.value ?? 0) / dueTotal) * 100) : null;
  const percent = (n: number) => (dueTotal ? `${Math.round((n / dueTotal) * 100)}%` : "0%");

  return (
    <div className="space-y-8">
      {header}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          variant="featured"
          title="Total checkouts"
          value={nf.format(data?.totals.loans ?? 0)}
          description={`In ${RANGE_LABEL[timeRange]}`}
          icon="library"
          loading={loading}
        />
        <StatCard
          title="Active readers"
          value={nf.format(data?.totals.activeReaders ?? 0)}
          description={`Read something in ${RANGE_LABEL[timeRange]}`}
          icon="class"
          loading={loading}
        />
        <StatCard
          title="Late returns"
          value={nf.format(lateTotal)}
          description={`Of ${nf.format(dueTotal)} loans due in ${RANGE_LABEL[timeRange]}`}
          icon="overdue"
          loading={loading}
        />
      </div>

      {data?.totals.truncated && (
        <p role="status" className="rounded-xl bg-bb-warning-soft px-4 py-3 text-sm text-bb-warning-ink">
          This range has a very large number of records, so the figures below are based on the most recent ones.
        </p>
      )}

      {loading ? (
        <Skeleton className="h-96 rounded-[22px]" />
      ) : (
        <Tabs defaultValue="engagement" className="space-y-6">
          <TabsList>
            <TabsTrigger value="engagement">Reading activity</TabsTrigger>
            <TabsTrigger value="borrowing">Borrowing trends</TabsTrigger>
            <TabsTrigger value="overdue">Return compliance</TabsTrigger>
          </TabsList>

          <TabsContent value="engagement" className="mt-0">
            <ChartSection
              title="Reading activity by weekday"
              tiles={[
                ["Avg. readers per day", avgReaders.toFixed(1)],
                ["Avg. pages per day", nf.format(Math.round(avgPages))],
                ["Busiest day", hasEngagement && busiest ? busiest.day : "-"],
                ["Active readers", nf.format(data.totals.activeReaders)],
              ]}
            >
              {hasEngagement ? (
                <ChartContainer config={engagementConfig} className="h-72 w-full">
                  <BarChart data={engagement} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="pages" fill="var(--color-pages)" radius={[9, 9, 0, 0]} />
                    <Bar dataKey="readers" fill="var(--color-readers)" radius={[9, 9, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState icon="analytics" title="No reading activity" description={`Nobody read anything in ${RANGE_LABEL[timeRange]}.`} />
              )}
            </ChartSection>
          </TabsContent>

          <TabsContent value="borrowing" className="mt-0">
            <ChartSection
              title="Material borrowing by type"
              tiles={[
                ["Physical books", nf.format(totals.physical)],
                ["E-books", nf.format(totals.ebook)],
                ["Audiobooks", nf.format(totals.audiobook)],
                ["All checkouts", nf.format(totals.physical + totals.ebook + totals.audiobook)],
              ]}
            >
              <ChartContainer config={borrowingConfig} className="h-72 w-full">
                <LineChart data={trends} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
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
              title="Return compliance"
              tiles={[
                ["On-time rate", onTimeRate === null ? "-" : `${onTimeRate}%`],
                ["Loans due", nf.format(dueTotal)],
                ["Returned or still out late", nf.format(lateTotal)],
                ["8+ days late", nf.format(distribution[3]?.value ?? 0)],
              ]}
            >
              {dueTotal > 0 ? (
                <div className="flex flex-col items-center gap-6 md:flex-row md:justify-center">
                  <ChartContainer config={{}} className="h-56 w-56">
                    <PieChart accessibilityLayer>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} strokeWidth={2}>
                        {distribution.map((_, i) => (
                          <Cell key={i} fill={overdueColors[i]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <ul className="space-y-2">
                    {distribution.map((item, i) => (
                      <li key={item.name} className="flex items-center gap-2 text-sm">
                        <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: overdueColors[i] }} />
                        {item.name}: <span className="font-semibold tabular-nums">{nf.format(item.value)}</span>
                        <span className="text-bb-muted tabular-nums">({percent(item.value)})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState icon="check-circle" title="No loans fell due" description={`No loans were due in ${RANGE_LABEL[timeRange]}.`} />
              )}
            </ChartSection>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

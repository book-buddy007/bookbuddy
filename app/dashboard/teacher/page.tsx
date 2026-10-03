"use client"

import React from 'react'
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts'
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Chip } from "@/components/ui/chip"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { StatusBadge, type BBStatus } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

// Sample data for statistics and charts. There is no teacher analytics endpoint yet.
const readingActivityData = [
  { month: 'Jan', books: 15 },
  { month: 'Feb', books: 18 },
  { month: 'Mar', books: 22 },
  { month: 'Apr', books: 19 },
  { month: 'May', books: 25 },
  { month: 'Jun', books: 28 },
  { month: 'Jul', books: 12 },
  { month: 'Aug', books: 20 },
  { month: 'Sep', books: 30 },
]

const resourcesUsageData = [
  { name: 'Physical books', value: 45 },
  { name: 'E-books', value: 25 },
  { name: 'Articles', value: 15 },
  { name: 'Other resources', value: 15 },
]

const studentEngagementData = [
  { month: 'Apr', assignments: 85, readings: 65 },
  { month: 'May', assignments: 78, readings: 70 },
  { month: 'Jun', assignments: 90, readings: 75 },
  { month: 'Jul', assignments: 65, readings: 60 },
  { month: 'Aug', assignments: 70, readings: 58 },
  { month: 'Sep', assignments: 88, readings: 80 },
]

const topStudents = [
  { name: 'Emma Watson', class: 'Science', score: 94 },
  { name: 'Thomas Anderson', class: 'Mathematics', score: 92 },
  { name: 'Olivia Martinez', class: 'English Literature', score: 90 },
  { name: 'James Wilson', class: 'World History', score: 88 },
]

const popularResources = [
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', views: 128 },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', views: 114 },
  { title: '1984', author: 'George Orwell', views: 96 },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', views: 82 },
]

const recentActivities: { id: number; type: string; title: string; time: string; class: string; status: string }[] = [
  { id: 1, type: 'bookReservation', title: 'Reserved 30 copies of "To Kill a Mockingbird"', time: '2 hours ago', class: 'English Literature', status: 'APPROVED' },
  { id: 2, type: 'assignmentCreated', title: 'Created "Cold War Research Paper" assignment', time: '1 day ago', class: 'World History', status: 'published' },
  { id: 3, type: 'readingList', title: 'Updated reading list for "Science" class', time: '3 days ago', class: 'Science', status: 'COMPLETED' },
  { id: 4, type: 'studentRequest', title: 'Emma Watson requested access to "Calculus Advanced Topics"', time: '5 days ago', class: 'Mathematics', status: 'PENDING' },
  { id: 5, type: 'bookReservation', title: 'Reserved 25 copies of "Great Expectations"', time: '1 week ago', class: 'English Literature', status: 'APPROVED' },
]

const upcomingEvents = [
  { id: 1, title: 'Book collection: "To Kill a Mockingbird"', date: new Date(2023, 8, 20), class: 'English Literature' },
  { id: 2, title: 'Assignment due: "Cold War Research Paper"', date: new Date(2023, 8, 15), class: 'World History' },
  { id: 3, title: 'Assignment due: "Ecosystem Study Report"', date: new Date(2023, 8, 25), class: 'Science' },
  { id: 4, title: 'Book reservation expiry: "Great Expectations"', date: new Date(2023, 8, 30), class: 'English Literature' },
]

const quickLinks: { title: string; body: string; cta: string; href: string; icon: BBIconName }[] = [
  { title: 'Browse library', body: 'Explore the complete digital library', cta: 'View library', href: '/catalog', icon: 'library' },
  { title: 'Teaching resources', body: 'Access and manage educational materials', cta: 'View resources', href: '/dashboard/teacher/resources', icon: 'folder' },
  { title: 'Audiobook player', body: 'Listen to audiobooks with our modern player', cta: 'Open player', href: '/player/v2', icon: 'audiobook' },
]

const readingConfig = {
  books: { label: 'Books', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig

const engagementConfig = {
  assignments: { label: 'Assignment completion', color: 'hsl(var(--chart-1))' },
  readings: { label: 'Reading progress', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig

const usageColors = ['hsl(var(--chart-1))', 'hsl(var(--chart-3))', 'hsl(var(--chart-2))', 'hsl(var(--chart-5))']

const activityIcon = (type: string): BBIconName =>
  type === 'bookReservation' ? 'bookmark' : type === 'assignmentCreated' ? 'assignment' : type === 'readingList' ? 'read' : 'class'

const activityStatus = (status: string): { status: BBStatus; label: string } => {
  switch (status) {
    case 'APPROVED': return { status: 'returned', label: 'Approved' }
    case 'COMPLETED': return { status: 'returned', label: 'Completed' }
    case 'PENDING': return { status: 'pending', label: 'Pending' }
    default: return { status: 'reserved', label: 'Published' }
  }
}

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)

const panel = "rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6"
const panelTitle = "font-display text-lg font-extrabold tracking-[-0.02em]"

export default function TeacherDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Teacher"
        title="Dashboard"
        description="Welcome back! Manage your classes, track student progress, and assign resources."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="featured" title="Total reservations" value="24" description="+12% from last month" icon="bookmark" trend="up" trendValue="+12%" />
        <StatCard title="Books assigned" value="145" description="+5% from last month" icon="read" trend="up" trendValue="+5%" />
        <StatCard title="Active students" value="128" description="+2% from last semester" icon="class" trend="up" trendValue="+2%" />
        <StatCard title="Reading completion" value="78%" description="+8% from last month" icon="trending-up" trend="up" trendValue="+8%" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="bb-lift group flex items-start gap-4 rounded-[18px] bg-bb-surface p-5 shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft">
              <Icon name={q.icon} size={22} />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold">{q.title}</h3>
              <p className="text-[13px] text-bb-muted">{q.body}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-bb-accent-ink">
                {q.cta} <Icon name="arrow-right" size={14} />
              </p>
            </div>
          </Link>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="activities">Recent activities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={panel}>
              <h3 className={panelTitle}>Reading activity</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Monthly book and resource usage</p>
              <ChartContainer config={readingConfig} className="h-[280px] w-full">
                <BarChart data={readingActivityData} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="books" fill="var(--color-books)" radius={[9, 9, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </section>

            <section className={panel}>
              <h3 className={panelTitle}>Resource usage</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Distribution by resource type</p>
              <div className="flex flex-col items-center gap-4">
                <ChartContainer config={{}} className="h-[200px] w-[200px]">
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                    <Pie data={resourcesUsageData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                      {resourcesUsageData.map((_, i) => (
                        <Cell key={i} fill={usageColors[i]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                  {resourcesUsageData.map((item, i) => (
                    <li key={item.name} className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: usageColors[i] }} />
                      <span className="text-bb-muted">{item.name}</span>
                      <span className="font-semibold tabular-nums">{item.value}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>

          <section className={panel}>
            <h3 className={panelTitle}>Upcoming events</h3>
            <p className="mb-4 text-[13px] text-bb-muted">Books and assignments due dates</p>
            <ul className="divide-y divide-bb-border">
              {upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft">
                    <Icon name="calendar" size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{event.title}</p>
                    <p className="text-sm text-bb-muted">{event.class}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-bb-accent-ink">{formatDate(event.date)}</span>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0 space-y-6">
          <section className={panel}>
            <h3 className={panelTitle}>Student engagement</h3>
            <p className="mb-4 text-[13px] text-bb-muted">Assignment completion vs. reading progress</p>
            <ChartContainer config={engagementConfig} className="h-[320px] w-full">
              <LineChart data={studentEngagementData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line dataKey="assignments" type="monotone" stroke="var(--color-assignments)" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line dataKey="readings" type="monotone" stroke="var(--color-readings)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className={panel}>
              <h3 className={panelTitle}>Top performing students</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Based on activity and completion rates</p>
              <ul className="space-y-4">
                {topStudents.map((student) => (
                  <li key={student.name} className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-bb-navy text-xs font-bold text-white">
                        {student.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{student.name}</p>
                      <p className="text-sm text-bb-muted">{student.class}</p>
                    </div>
                    <span className="font-bold tabular-nums">{student.score}%</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className={panel}>
              <h3 className={panelTitle}>Most popular resources</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Based on usage analytics</p>
              <ul className="space-y-4">
                {popularResources.map((book) => (
                  <li key={book.title} className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-bb-accent-soft">
                      <Icon name="read" size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{book.title}</p>
                      <p className="text-sm text-bb-muted">{book.author}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{book.views} views</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="activities" className="mt-0">
          <section className={panel}>
            <h3 className={panelTitle}>Recent activities</h3>
            <p className="mb-4 text-[13px] text-bb-muted">Your recent library management activities</p>
            <ul className="space-y-5">
              {recentActivities.map((activity) => {
                const s = activityStatus(activity.status)
                return (
                  <li key={activity.id} className="flex items-start gap-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-bb-surface-2">
                      <Icon name={activityIcon(activity.type)} size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                        <p className="font-semibold">{activity.title}</p>
                        <span className="text-xs text-bb-muted">{activity.time}</span>
                      </div>
                      <p className="text-sm text-bb-muted">{activity.class}</p>
                      <StatusBadge status={s.status} label={s.label} className="mt-2" />
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  )
}

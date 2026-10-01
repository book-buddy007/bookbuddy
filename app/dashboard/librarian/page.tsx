"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Icon, type BBIconName } from "@/components/ui/icon"
import { PageHeader } from "@/components/ui/page-header"
import { StatCard } from "@/components/ui/stat-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Sample data. There is no librarian overview endpoint behind this page yet.
const recentActivities = [
  { type: 'Book Return', user: 'Emma Wilson', item: 'The Great Gatsby', time: '10 minutes ago' },
  { type: 'Book Checkout', user: 'Michael Brown', item: 'To Kill a Mockingbird', time: '30 minutes ago' },
  { type: 'Renewal', user: 'Sophia Davis', item: 'Pride and Prejudice', time: '1 hour ago' },
  { type: 'Book Return', user: 'James Johnson', item: '1984', time: '2 hours ago' },
  { type: 'Fine Payment', user: 'William Taylor', item: '$5.50', time: '3 hours ago' },
]

const upcomingReturns = [
  { user: 'Emma Wilson', book: 'The Great Gatsby', dueDate: 'Tomorrow' },
  { user: 'Michael Brown', book: 'To Kill a Mockingbird', dueDate: 'In 2 days' },
  { user: 'Sophia Davis', book: 'Pride and Prejudice', dueDate: 'In 3 days' },
]

const pendingRequests = [
  { user: 'Emma Wilson', type: 'Borrow', book: 'The Great Gatsby', date: 'Today, 10:30 AM' },
  { user: 'Michael Brown', type: 'Return', book: 'To Kill a Mockingbird', date: 'Today, 9:15 AM' },
  { user: 'Sophia Davis', type: 'Renew', book: 'Pride and Prejudice', date: 'Yesterday, 3:45 PM' },
]

const inventoryAlerts = [
  { book: 'The Great Gatsby', issue: 'Missing', priority: 'High' },
  { book: 'To Kill a Mockingbird', issue: 'Damaged Cover', priority: 'Medium' },
  { book: '1984', issue: 'Water Damage', priority: 'High' },
]

const quickActions: { label: string; href: string; icon: BBIconName }[] = [
  { label: "Add new book", href: "/dashboard/librarian/cataloging", icon: "plus" },
  { label: "Process request", href: "/dashboard/librarian/circulation", icon: "scan" },
  { label: "Bulk upload books", href: "/dashboard/librarian/bulk-upload", icon: "upload" },
  { label: "Generate labels", href: "/dashboard/librarian/label-generator", icon: "tag" },
  { label: "View reports", href: "/dashboard/librarian/analytics", icon: "analytics" },
]

const activityIcon = (type: string): BBIconName =>
  type.includes('Return') ? 'arrow-left' : type.includes('Checkout') ? 'arrow-right' : type.includes('Fine') ? 'subscription' : 'rotate-cw'

const ActivityList = ({ items }: { items: typeof recentActivities }) => (
  <ul className="space-y-4">
    {items.map((activity, i) => (
      <li key={i} className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-bb-surface-2">
          <Icon name={activityIcon(activity.type)} size={16} />
        </span>
        <div className="min-w-0 text-sm">
          <p className="font-semibold">{activity.type}</p>
          <p className="text-bb-muted">{activity.user} · {activity.item}</p>
          <p className="text-xs text-bb-muted">{activity.time}</p>
        </div>
      </li>
    ))}
  </ul>
)

const panel = "rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6"
const panelTitle = "mb-4 font-display text-lg font-extrabold tracking-[-0.02em]"
const moreLink = "mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-bb-accent-ink hover:underline"

export default function LibrarianDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Dashboard"
        description="Manage circulation, book entry, and library operations efficiently."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="featured" title="Pending requests" value="24" description="12 borrow, 8 return, 4 renewal" icon="calendar" />
        <StatCard title="Books checked out" value="156" description="+12 from yesterday" icon="read" trend="up" trendValue="+12" />
        <StatCard title="Overdue items" value="18" description="Total fines: $45.50" icon="overdue" trend="down" trendValue="-3" />
        <StatCard title="Total collection" value="2,543" description="+45 new this month" icon="library" trend="up" trendValue="+45" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={panel}>
          <h2 className={panelTitle}>Quick actions</h2>
          <div className="space-y-2.5">
            {quickActions.map((a) => (
              <Button key={a.href} asChild variant="outline" className="w-full justify-start">
                <Link href={a.href}>
                  <Icon name={a.icon} size={18} /> {a.label}
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <section className={panel}>
          <h2 className={panelTitle}>Recent activity</h2>
          <ActivityList items={recentActivities.slice(0, 3)} />
          <Link href="/dashboard/librarian/circulation" className={moreLink}>
            View all activity <Icon name="arrow-up-right" size={14} />
          </Link>
        </section>

        <section className={panel}>
          <h2 className={panelTitle}>Inventory alerts</h2>
          <ul className="space-y-4">
            {inventoryAlerts.map((alert, i) => (
              <li key={i} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold">{alert.book}</p>
                  <p className="text-bb-muted">{alert.issue}</p>
                </div>
                <StatusBadge status={alert.priority === 'High' ? 'overdue' : 'due-soon'} label={alert.priority} className="shrink-0" />
              </li>
            ))}
          </ul>
          <Link href="/dashboard/librarian/inventory" className={moreLink}>
            View all alerts <Icon name="arrow-up-right" size={14} />
          </Link>
        </section>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming returns</TabsTrigger>
          <TabsTrigger value="PENDING">Pending requests</TabsTrigger>
          <TabsTrigger value="activity">Latest activity</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4">
          <div className={panel}>
            <ul className="divide-y divide-bb-border">
              {upcomingReturns.map((item, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.book}</p>
                    <p className="text-sm text-bb-muted">{item.user}</p>
                  </div>
                  <StatusBadge status="due-soon" label={`Due ${item.dueDate.toLowerCase()}`} className="shrink-0" />
                </li>
              ))}
            </ul>
            <Link href="/dashboard/librarian/circulation" className={moreLink}>
              View all upcoming returns <Icon name="arrow-up-right" size={14} />
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="PENDING" className="mt-4">
          <div className={panel}>
            <ul className="divide-y divide-bb-border">
              {pendingRequests.map((request, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-semibold">{request.type}: {request.book}</p>
                    <p className="text-sm text-bb-muted">{request.user} · {request.date}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="shrink-0">
                    <Link href="/dashboard/librarian/circulation">Process</Link>
                  </Button>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/librarian/circulation" className={moreLink}>
              View all pending requests <Icon name="arrow-up-right" size={14} />
            </Link>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <div className={panel}>
            <ActivityList items={recentActivities} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

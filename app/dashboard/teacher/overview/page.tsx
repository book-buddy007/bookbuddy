'use client';

import React from 'react';
import { Chip } from '@/components/ui/chip';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, type BBStatus } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Sample data. There is no teacher overview endpoint behind this page yet.
const classes = [
  { name: 'English Literature', level: 'Advanced Placement, Grade 11', students: 32, utilization: 78, completion: 84, deadlines: 3 },
  { name: 'World History', level: 'Regular Track, Grade 10', students: 28, utilization: 65, completion: 72, deadlines: 1 },
  { name: 'Science', level: 'Advanced Placement, Grade 10', students: 35, utilization: 92, completion: 88, deadlines: 4 },
  { name: 'Mathematics', level: 'Honors, Grade 11', students: 33, utilization: 81, completion: 79, deadlines: 2 },
];

const assignments = [
  { title: 'Modernist Literature Analysis', meta: 'English Literature • Due in 3 days', submitted: 26, total: 32 },
  { title: 'Cold War Research Paper', meta: 'World History • Due tomorrow', submitted: 14, total: 28 },
  { title: 'Ecosystem Study Report', meta: 'Science • Due in 5 days', submitted: 29, total: 35 },
  { title: 'Calculus Problem Set #4', meta: 'Mathematics • Due in 2 days', submitted: 18, total: 33 },
  { title: 'Lab Exercise: Chemical Reactions', meta: 'Science • Due in 1 week', submitted: 7, total: 35 },
];

const readingLists: { title: string; meta: string; status: 'Published' | 'Draft' }[] = [
  { title: '20th Century American Literature', meta: 'English Literature • 12 resources', status: 'Published' },
  { title: 'World War II Primary Sources', meta: 'World History • 8 resources', status: 'Published' },
  { title: 'Climate Science Collection', meta: 'Science • 15 resources', status: 'Draft' },
];

const reservedBooks: { title: string; meta: string; status: 'Confirmed' | 'Pending' }[] = [
  { title: 'Class Set: To Kill a Mockingbird', meta: 'English Literature • 35 copies', status: 'Confirmed' },
  { title: 'Historical Atlas Collection', meta: 'World History • 15 copies', status: 'Confirmed' },
  { title: 'Physics Lab Manuals', meta: 'Science • 20 copies', status: 'Pending' },
];

const schedule: { title: string; meta: string; tag: string; icon: BBIconName; confirmed: boolean }[] = [
  { title: 'Library Lab Session', meta: 'Science Class • Today at 2:30 PM', tag: 'Confirmed', icon: 'calendar', confirmed: true },
  { title: 'Research Paper Due', meta: 'World History • Tomorrow', tag: 'Assignment', icon: 'assignment', confirmed: false },
  { title: 'Book Discussion Session', meta: 'English Literature • Friday at 10:00 AM', tag: 'Confirmed', icon: 'read', confirmed: true },
];

const messages = [
  { from: 'Ms. Johnson, Librarian', body: 'Your book reservation has been confirmed for Friday.', when: '2 hours ago' },
  { from: 'System notification', body: "5 students haven't accessed the required reading.", when: 'Yesterday' },
  { from: 'Mr. Roberts, Principal', body: 'Please submit your resource needs for next semester.', when: '2 days ago' },
];

const submissionBadge = (pct: number): { status: BBStatus; label: string } =>
  pct >= 75 ? { status: 'returned', label: `${pct}%` } : pct >= 40 ? { status: 'due-soon', label: `${pct}%` } : { status: 'overdue', label: `${pct}%` };

const panel = 'rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6';
const panelTitle = 'font-display text-lg font-extrabold tracking-[-0.02em]';

const Row = ({ title, meta, right }: { title: string; meta: string; right: React.ReactNode }) => (
  <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
    <div className="min-w-0">
      <div className="font-semibold">{title}</div>
      <div className="text-sm text-bb-muted">{meta}</div>
    </div>
    <div className="flex shrink-0 items-center gap-3">{right}</div>
  </li>
);

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Teacher"
        title="Class overview"
        description="Your classes, assignments and resources at a glance."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="featured" title="Active classes" value="4" description="128 students enrolled" icon="class" />
        <StatCard title="Reserved books" value="36" description="For upcoming lessons" icon="bookmark" />
        <StatCard title="Assignment submissions" value="74%" description="Average submission rate" icon="assignment" trend="up" trendValue="+5%" />
        <StatCard title="Resource access" value="82%" description="Students accessing resources" icon="arrow-up-right" trend="up" trendValue="+8%" />
      </div>

      <Tabs defaultValue="classes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            {classes.map((c) => (
              <article key={c.name} className={panel}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className={panelTitle}>{c.name}</h3>
                    <p className="text-[13px] text-bb-muted">{c.level}</p>
                  </div>
                  <Chip icon="class">{c.students} students</Chip>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-bb-muted">Resource utilization</span>
                      <span className="font-bold tabular-nums">{c.utilization}%</span>
                    </div>
                    <Progress value={c.utilization} />
                  </div>
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-bb-muted">Assignment completion</span>
                      <span className="font-bold tabular-nums">{c.completion}%</span>
                    </div>
                    <Progress value={c.completion} />
                  </div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Icon name="calendar" size={16} /> {c.deadlines} upcoming deadline{c.deadlines === 1 ? '' : 's'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="mt-0">
          <section className={panel}>
            <h3 className={panelTitle}>Assignment status</h3>
            <p className="mb-4 text-[13px] text-bb-muted">Overview of your recent assignments</p>
            <ul className="divide-y divide-bb-border">
              {assignments.map((a) => {
                const pct = Math.round((a.submitted / a.total) * 100);
                const badge = submissionBadge(pct);
                return (
                  <Row
                    key={a.title}
                    title={a.title}
                    meta={a.meta}
                    right={
                      <>
                        <span className="hidden text-sm tabular-nums sm:inline">{a.submitted}/{a.total} submitted</span>
                        <StatusBadge status={badge.status} label={badge.label} />
                      </>
                    }
                  />
                );
              })}
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="resources" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <section className={panel}>
              <h3 className={panelTitle}>Reading lists</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Curated resources for your classes</p>
              <ul className="divide-y divide-bb-border">
                {readingLists.map((l) => (
                  <Row
                    key={l.title}
                    title={l.title}
                    meta={l.meta}
                    right={l.status === 'Published' ? <StatusBadge status="returned" label="Published" /> : <Chip>Draft</Chip>}
                  />
                ))}
              </ul>
            </section>

            <section className={panel}>
              <h3 className={panelTitle}>Reserved books</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Books reserved for classroom use</p>
              <ul className="divide-y divide-bb-border">
                {reservedBooks.map((b) => (
                  <Row
                    key={b.title}
                    title={b.title}
                    meta={b.meta}
                    right={b.status === 'Confirmed' ? <StatusBadge status="returned" label="Confirmed" /> : <StatusBadge status="pending" />}
                  />
                ))}
              </ul>
            </section>
          </div>
        </TabsContent>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${panel} lg:col-span-3`}>
          <h3 className={panelTitle}>Upcoming schedule</h3>
          <p className="mb-4 text-[13px] text-bb-muted">Your reservations and due dates for the week</p>
          <ul className="space-y-4">
            {schedule.map((s) => (
              <li key={s.title} className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bb-accent-soft">
                  <Icon name={s.icon} size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-bb-muted">{s.meta}</div>
                </div>
                {s.confirmed ? <StatusBadge status="returned" label={s.tag} /> : <Chip>{s.tag}</Chip>}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${panel} lg:col-span-2`}>
          <h3 className={panelTitle}>Messages</h3>
          <p className="mb-4 text-[13px] text-bb-muted">Recent communications</p>
          <ul className="space-y-4">
            {messages.map((m) => (
              <li key={m.from} className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-bb-surface-2">
                  <Icon name="mail" size={16} />
                </span>
                <div className="min-w-0 text-sm">
                  <div className="font-semibold">{m.from}</div>
                  <div className="text-bb-muted">{m.body}</div>
                  <div className="mt-0.5 text-xs text-bb-muted">{m.when}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

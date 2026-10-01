'use client';

import React, { useState } from 'react';
import { BookCover } from '@/components/ui/book-cover';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';

interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
}

interface Reservation {
  id: string;
  title: string;
  author: string;
  cover: string;
  className: string;
  startDate: Date;
  endDate: Date;
  copies: number;
  status: 'APPROVED' | 'PENDING';
}

// Sample data. There is no reading-list or reservation endpoint behind this page yet.
const classes: ClassInfo[] = [
  { id: 'cl1', name: 'English Literature', studentCount: 32 },
  { id: 'cl2', name: 'World History', studentCount: 28 },
  { id: 'cl3', name: 'Science', studentCount: 35 },
  { id: 'cl4', name: 'Mathematics', studentCount: 33 },
];

const initialReservations: Reservation[] = [
  {
    id: 'res1',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    cover: 'https://covers.openlibrary.org/b/id/8276532-L.jpg',
    className: 'English Literature',
    startDate: new Date(2023, 8, 10),
    endDate: new Date(2023, 8, 17),
    copies: 30,
    status: 'APPROVED',
  },
  {
    id: 'res2',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    cover: 'https://covers.openlibrary.org/b/id/8417576-L.jpg',
    className: 'World History',
    startDate: new Date(2023, 8, 15),
    endDate: new Date(2023, 8, 22),
    copies: 15,
    status: 'PENDING',
  },
];

const formatDate = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);

export default function ResourcesPage() {
  const { toast } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);

  const comingSoon = (what: string) =>
    toast({ title: 'Coming soon', description: `${what} isn't available yet.` });

  const cancel = (r: Reservation) => {
    setReservations((prev) => prev.filter((x) => x.id !== r.id));
    toast({ title: 'Reservation cancelled (sample)', description: r.title });
  };

  const reservedCopies = reservations.reduce((sum, r) => sum + r.copies, 0);
  const pending = reservations.filter((r) => r.status === 'PENDING').length;

  const columns: DataColumn<Reservation>[] = [
    {
      key: 'book',
      header: 'Book',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <BookCover title={r.title} coverUrl={r.cover} width={32} />
          <div className="min-w-0">
            <div className="font-semibold">{r.title}</div>
            <div className="text-xs text-bb-muted">{r.author}</div>
          </div>
        </div>
      ),
    },
    { key: 'class', header: 'Class', cell: (r) => r.className },
    {
      key: 'dates',
      header: 'Dates',
      cell: (r) => `${formatDate(r.startDate)} – ${formatDate(r.endDate)}`,
      className: 'whitespace-nowrap text-bb-muted',
    },
    { key: 'copies', header: 'Copies', cell: (r) => <span className="tabular-nums">{r.copies}</span> },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => (r.status === 'APPROVED' ? <StatusBadge status="returned" label="Approved" /> : <StatusBadge status="pending" />),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Teacher"
        title="Resource management"
        description="Manage reading lists and book reservations for your classes."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard variant="featured" title="Classes" value={classes.length} description="Reading lists coming soon" icon="class" />
        <StatCard title="Reserved copies" value={reservedCopies} description={`${reservations.length} reservations`} icon="bookmark" />
        <StatCard title="Awaiting approval" value={pending} description="Pending reservations" icon="calendar" />
      </div>

      <Tabs defaultValue="reading-lists" className="space-y-6">
        <TabsList>
          <TabsTrigger value="reading-lists">Reading lists</TabsTrigger>
          <TabsTrigger value="reservations">Book reservations</TabsTrigger>
        </TabsList>

        <TabsContent value="reading-lists" className="mt-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {classes.map((c) => (
              <article key={c.id} className="flex items-center justify-between gap-3 rounded-[18px] bg-bb-surface p-5 shadow-e1">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-[13px] text-bb-muted">{c.studentCount} students</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => comingSoon('The reading list editor')}>
                  <Icon name="edit" size={16} /> Edit list
                </Button>
              </article>
            ))}
          </div>
          <EmptyState
            icon="bookmark"
            title="Reading list editor is coming soon"
            description="You'll be able to build a reading list for each class from the library catalog."
          />
        </TabsContent>

        <TabsContent value="reservations" className="mt-0 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => comingSoon('Creating reservations')}>
              <Icon name="plus" size={18} /> New reservation
            </Button>
          </div>
          <DataTable
            columns={columns}
            rows={reservations}
            rowKey={(r) => r.id}
            emptyIcon="bookmark"
            emptyTitle="No reservations"
            emptyDescription="Class sets you reserve will appear here."
            actionsHeader="Actions"
            renderActions={(r) => <button onClick={() => cancel(r)}>Cancel</button>}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

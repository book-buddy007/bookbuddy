'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { DataTable, type DataColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Progress } from '@/components/ui/progress';
import { SearchInput } from '@/components/ui/search-input';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge, type BBStatus } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type InventoryStatus = 'Available' | 'Checked Out' | 'Damaged' | 'Missing';

interface InventoryItem {
  id: number;
  title: string;
  author: string;
  isbn: string;
  format: 'Physical' | 'E-Book' | 'Audiobook';
  catalogCode: string;
  status: InventoryStatus;
  condition?: string;
  location?: string;
  acquisitionDate: string;
  lastChecked: string;
}

// Sample inventory. There is no inventory endpoint behind this page yet.
const mockInventory: InventoryItem[] = [
  { id: 1, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565', format: 'Physical', catalogCode: 'FIC-FIT-1925', status: 'Available', condition: 'Good', location: 'Main Library - Fiction Section', acquisitionDate: '2022-01-15', lastChecked: '2023-05-20' },
  { id: 2, title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084', format: 'Physical', catalogCode: 'FIC-LEE-1960', status: 'Checked Out', condition: 'Good', location: 'Main Library - Fiction Section', acquisitionDate: '2021-11-10', lastChecked: '2023-05-20' },
  { id: 3, title: '1984', author: 'George Orwell', isbn: '9780451524935', format: 'E-Book', catalogCode: 'FIC-ORW-1949', status: 'Available', acquisitionDate: '2022-03-05', lastChecked: '2023-05-20' },
  { id: 4, title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518', format: 'Physical', catalogCode: 'FIC-AUS-1813', status: 'Available', condition: 'Fair', location: 'Main Library - Classics Section', acquisitionDate: '2020-07-22', lastChecked: '2023-05-20' },
  { id: 5, title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227', format: 'Physical', catalogCode: 'FIC-TOL-1937', status: 'Damaged', condition: 'Poor', location: 'Main Library - Fantasy Section', acquisitionDate: '2019-12-05', lastChecked: '2023-05-20' },
  { id: 6, title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling', isbn: '9780590353427', format: 'Physical', catalogCode: 'FIC-ROW-1997', status: 'Available', condition: 'New', location: 'Main Library - Fantasy Section', acquisitionDate: '2022-06-15', lastChecked: '2023-05-20' },
  { id: 7, title: 'The Lord of the Rings', author: 'J.R.R. Tolkien', isbn: '9780618640157', format: 'E-Book', catalogCode: 'FIC-TOL-1954', status: 'Available', acquisitionDate: '2022-02-10', lastChecked: '2023-05-20' },
  { id: 8, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen', isbn: '9780262033848', format: 'Physical', catalogCode: 'TEC-COR-2009', status: 'Checked Out', condition: 'Good', location: 'Main Library - Technology Section', acquisitionDate: '2021-09-03', lastChecked: '2023-05-20' },
  { id: 9, title: 'A Brief History of Time', author: 'Stephen Hawking', isbn: '9780553380163', format: 'Audiobook', catalogCode: 'SCI-HAW-1988', status: 'Available', acquisitionDate: '2022-04-18', lastChecked: '2023-05-20' },
  { id: 10, title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', isbn: '9780062316097', format: 'Physical', catalogCode: 'HIS-HAR-2011', status: 'Missing', condition: 'Good', location: 'Main Library - History Section', acquisitionDate: '2020-11-15', lastChecked: '2023-05-20' },
];

const STATUS_BADGE: Record<InventoryStatus, { status: BBStatus; label: string }> = {
  Available: { status: 'returned', label: 'Available' },
  'Checked Out': { status: 'reserved', label: 'Checked out' },
  Damaged: { status: 'due-soon', label: 'Damaged' },
  Missing: { status: 'overdue', label: 'Missing' },
};

const STATUSES: InventoryStatus[] = ['Available', 'Checked Out', 'Damaged', 'Missing'];

// Share of the collection at which a problem state becomes a warning / critical.
const THRESHOLDS = {
  missing: { warn: 5, critical: 10 },
  damaged: { warn: 10, critical: 20 },
};

const tips = [
  { title: 'Regular audits', body: 'Schedule full inventory audits at least twice a year, with spot checks monthly for high-circulation areas.' },
  { title: 'Classification consistency', body: 'Maintain consistent classification codes for easy location and retrieval.' },
  { title: 'Condition assessment', body: 'Regularly assess item condition during check-in, with a standardized scale: New, Good, Fair, Poor, or Damaged.' },
  { title: 'Data integrity', body: 'Validate inventory data regularly, ensuring all items have complete metadata and classification codes.' },
];

export default function InventoryPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(mockInventory);
  const [searchQuery, setSearchQuery] = useState('');

  const handleStatusChange = (id: number, status: InventoryStatus) => {
    setInventoryItems((items) => items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const count = (s: InventoryStatus) => inventoryItems.filter((i) => i.status === s).length;
  const total = inventoryItems.length;

  const q = searchQuery.trim().toLowerCase();
  const visible = q
    ? inventoryItems.filter((i) =>
        [i.title, i.author, i.isbn, i.catalogCode].some((v) => v.toLowerCase().includes(q))
      )
    : inventoryItems;

  const columns: DataColumn<InventoryItem>[] = [
    {
      key: 'title',
      header: 'Title',
      cell: (i) => (
        <>
          <div className="font-semibold">{i.title}</div>
          <div className="text-xs text-bb-muted">{i.author}</div>
        </>
      ),
    },
    { key: 'code', header: 'Catalog code', cell: (i) => <span className="font-mono text-[13px]">{i.catalogCode}</span>, className: 'whitespace-nowrap' },
    {
      key: 'format',
      header: 'Format',
      cell: (i) => <Chip icon={i.format === 'Audiobook' ? 'audiobook' : i.format === 'E-Book' ? 'read' : 'library'}>{i.format}</Chip>,
    },
    { key: 'location', header: 'Location', cell: (i) => i.location ?? 'Digital', className: 'text-bb-muted' },
    { key: 'condition', header: 'Condition', cell: (i) => i.condition ?? '—', className: 'text-bb-muted' },
    {
      key: 'status',
      header: 'Status',
      cell: (i) => <StatusBadge status={STATUS_BADGE[i.status].status} label={STATUS_BADGE[i.status].label} />,
    },
    {
      key: 'set',
      header: 'Set status',
      cell: (i) => (
        <Select value={i.status} onValueChange={(v) => handleStatusChange(i.id, v as InventoryStatus)}>
          <SelectTrigger className="h-9 w-36" aria-label={`Set status for ${i.title}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_BADGE[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  const health = (key: 'missing' | 'damaged', label: string, n: number) => {
    const pct = total ? Math.round((n / total) * 100) : 0;
    const level = pct >= THRESHOLDS[key].critical ? 'overdue' : pct >= THRESHOLDS[key].warn ? 'due-soon' : 'returned';
    return (
      <div key={key} className="rounded-[18px] bg-bb-surface p-5 shadow-e1">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold">{label}</h3>
          <StatusBadge status={level} label={level === 'overdue' ? 'Critical' : level === 'due-soon' ? 'Warning' : 'Healthy'} />
        </div>
        <div className="flex items-center gap-3">
          <Progress value={pct} className="flex-1" />
          <span className="text-sm font-bold tabular-nums">{pct}%</span>
        </div>
        <p className="mt-2 text-[13px] text-bb-muted">
          {n} of {total} items · warns at {THRESHOLDS[key].warn}%, critical at {THRESHOLDS[key].critical}%
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Inventory management"
        description="Manage your library inventory, monitor status, and maintain classification codes."
        actions={
          <>
            <Chip icon="info">Sample data</Chip>
            <Button asChild>
              <Link href="/dashboard/librarian/cataloging">
                <Icon name="plus" size={18} /> Add item
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="featured" title="Total items" value={total} description="In library" icon="library" />
        <StatCard title="Available" value={count('Available')} description="Ready to borrow" icon="check-circle" />
        <StatCard title="Checked out" value={count('Checked Out')} description="Currently borrowed" icon="read" />
        <StatCard title="Issues" value={count('Damaged') + count('Missing')} description="Damaged or missing" icon="alert" />
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList>
          <TabsTrigger value="catalog">Library listing</TabsTrigger>
          <TabsTrigger value="health">Inventory health</TabsTrigger>
          <TabsTrigger value="system">Classification system</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-0 space-y-4">
          <SearchInput
            wrapperClassName="sm:max-w-sm"
            placeholder="Search title, author, ISBN or code"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <DataTable
            columns={columns}
            rows={visible}
            rowKey={(i) => i.id}
            emptyIcon="search"
            emptyTitle="No matching items"
            emptyDescription="Try a different title, author, ISBN or catalog code."
          />
        </TabsContent>

        <TabsContent value="health" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            {health('missing', 'Missing items', count('Missing'))}
            {health('damaged', 'Damaged items', count('Damaged'))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="mt-0">
          <EmptyState
            icon="tag"
            title="Classification system is coming soon"
            description="Auto-generated catalog codes (GENRE-YEAR-SEQ, GENRE-AUTHOR-YEAR) aren't available yet."
          />
        </TabsContent>
      </Tabs>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Inventory best practices</h2>
          <p className="text-[13px] text-bb-muted">Tips for maintaining an accurate and efficient inventory</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {tips.map((t) => (
            <article key={t.title} className="rounded-[18px] bg-bb-surface p-5 shadow-e1">
              <h3 className="font-semibold">{t.title}</h3>
              <p className="mt-1 text-sm text-bb-muted">{t.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

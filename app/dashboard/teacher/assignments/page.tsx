'use client';

import React, { useMemo, useState } from 'react';
import { BookCover } from '@/components/ui/book-cover';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { SearchInput } from '@/components/ui/search-input';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ResourceType = 'book' | 'ebook' | 'article' | 'website';

interface Resource {
  id: string;
  title: string;
  author?: string;
  cover?: string;
  type: ResourceType;
  available: boolean;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  classId: string;
  className: string;
  dueDate: Date;
  status: 'published' | 'draft';
  resourceIds: string[];
}

// Sample data. There is no assignments or resources endpoint behind this page yet.
const RESOURCES: Resource[] = [
  { id: 'r1', title: 'The Waste Land', author: 'T.S. Eliot', cover: 'https://covers.openlibrary.org/b/id/581487-L.jpg', type: 'book', available: true },
  { id: 'r2', title: 'Ulysses', author: 'James Joyce', cover: 'https://covers.openlibrary.org/b/id/8240642-L.jpg', type: 'book', available: true },
  { id: 'r3', title: 'Mrs. Dalloway', author: 'Virginia Woolf', cover: 'https://covers.openlibrary.org/b/id/8231870-L.jpg', type: 'book', available: true },
  { id: 'r4', title: 'The Cold War: A New History', author: 'John Lewis Gaddis', cover: 'https://covers.openlibrary.org/b/id/10110203-L.jpg', type: 'book', available: true },
  { id: 'r5', title: 'Understanding the Modern World', author: 'Academic Journal', type: 'article', available: true },
  { id: 'r6', title: 'Introduction to Ecology', author: 'American Ecological Society', type: 'ebook', available: true },
  { id: 'r7', title: 'Local Ecosystems Database', type: 'website', available: true },
  { id: 'r8', title: 'Wetlands Field Guide', author: 'Regional Parks Trust', type: 'ebook', available: true },
  { id: 'r9', title: 'Biodiversity Basics', author: 'Science Weekly', type: 'article', available: true },
  { id: 'r10', title: 'Calculus: Early Transcendentals', author: 'James Stewart', type: 'book', available: false },
];

const initialAssignments: Assignment[] = [
  { id: 'a1', title: 'Modernist Literature Analysis', description: 'Analyze the themes and techniques in modernist literature works.', classId: 'cl1', className: 'English Literature', dueDate: new Date(2023, 8, 20), status: 'published', resourceIds: ['r1', 'r2', 'r3'] },
  { id: 'a2', title: 'Cold War Research Paper', description: 'Research and write a paper on a specific aspect of the Cold War.', classId: 'cl2', className: 'World History', dueDate: new Date(2023, 8, 15), status: 'published', resourceIds: ['r4', 'r5'] },
  { id: 'a3', title: 'Ecosystem Study Report', description: 'Study and report on a local ecosystem.', classId: 'cl3', className: 'Science', dueDate: new Date(2023, 8, 25), status: 'published', resourceIds: ['r6', 'r7', 'r8', 'r9'] },
  { id: 'a4', title: 'Calculus Problem Set #4', description: 'Complete the problems in section 4.2 of the textbook.', classId: 'cl4', className: 'Mathematics', dueDate: new Date(2023, 8, 18), status: 'published', resourceIds: ['r10'] },
  { id: 'a5', title: 'Poetry Analysis Project', description: 'Select a poem and analyze its structure, language, and themes.', classId: 'cl1', className: 'English Literature', dueDate: new Date(2023, 9, 5), status: 'draft', resourceIds: [] },
];

const TYPE_ICON: Record<ResourceType, BBIconName> = {
  book: 'library',
  ebook: 'read',
  article: 'pdf',
  website: 'globe',
};

const panel = 'rounded-[22px] bg-bb-surface p-5 shadow-e1 sm:p-6';
const panelTitle = 'font-display text-lg font-extrabold tracking-[-0.02em]';

const ResourceRow = ({ resource, action }: { resource: Resource; action: React.ReactNode }) => (
  <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
    {resource.type === 'book' || resource.cover ? (
      <BookCover title={resource.title} coverUrl={resource.cover} width={36} />
    ) : (
      <span className="flex h-[53px] w-9 shrink-0 items-center justify-center rounded-md bg-bb-surface-2">
        <Icon name={TYPE_ICON[resource.type]} size={18} />
      </span>
    )}
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-semibold">{resource.title}</p>
      <p className="truncate text-xs text-bb-muted">
        {resource.author ?? 'Web resource'} · <span className="capitalize">{resource.type}</span>
        {!resource.available && ' · Unavailable'}
      </p>
    </div>
    {action}
  </li>
);

export default function AssignmentsPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [selectedId, setSelectedId] = useState<string>(initialAssignments[0].id);
  const [query, setQuery] = useState('');

  const published = assignments.filter((a) => a.status === 'published');
  const drafts = assignments.filter((a) => a.status === 'draft');
  const totalResources = assignments.reduce((sum, a) => sum + a.resourceIds.length, 0);

  const selected = assignments.find((a) => a.id === selectedId) ?? assignments[0];
  const linked = selected.resourceIds
    .map((id) => RESOURCES.find((r) => r.id === id))
    .filter((r): r is Resource => !!r);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RESOURCES.filter(
      (r) => !q || r.title.toLowerCase().includes(q) || (r.author ?? '').toLowerCase().includes(q)
    );
  }, [query]);

  const toggleLink = (resourceId: string) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id !== selected.id
          ? a
          : {
              ...a,
              resourceIds: a.resourceIds.includes(resourceId)
                ? a.resourceIds.filter((id) => id !== resourceId)
                : [...a.resourceIds, resourceId],
            }
      )
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Teacher"
        title="Assignments"
        description="Manage assignments and attach library resources."
        actions={<Chip icon="info">Sample data</Chip>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard variant="featured" title="Total assignments" value={assignments.length} description="All assignments" icon="assignment" />
        <StatCard title="Published" value={published.length} description="Active assignments" icon="check-circle" />
        <StatCard title="Drafts" value={drafts.length} description="Unpublished assignments" icon="edit" />
        <StatCard title="Linked resources" value={totalResources} description="Total library resources" icon="library" />
      </div>

      <Tabs defaultValue="resources" className="space-y-6">
        <TabsList>
          <TabsTrigger value="resources">Resource linker</TabsTrigger>
          <TabsTrigger value="manage">Manage assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="resources" className="mt-0">
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={panel}>
              <h3 className={panelTitle}>Linked to this assignment</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Choose an assignment, then add resources from the library</p>

              <FormField label="Assignment" htmlFor="assignment-select" className="mb-5">
                <Select value={selectedId} onValueChange={setSelectedId}>
                  <SelectTrigger id="assignment-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.title} · {a.className}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {linked.length === 0 ? (
                <EmptyState icon="library" title="No resources linked yet" description="Search the library on the right and add some." />
              ) : (
                <ul className="divide-y divide-bb-border">
                  {linked.map((r) => (
                    <ResourceRow
                      key={r.id}
                      resource={r}
                      action={
                        <Button size="sm" variant="outline" onClick={() => toggleLink(r.id)}>
                          Unlink
                        </Button>
                      }
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className={panel}>
              <h3 className={panelTitle}>Library resources</h3>
              <p className="mb-4 text-[13px] text-bb-muted">Search by title or author</p>
              <SearchInput placeholder="Search resources" value={query} onChange={(e) => setQuery(e.target.value)} />

              <div className="mt-5">
                {results.length === 0 ? (
                  <EmptyState icon="search" title="No matching resources" description="Try a different title or author." />
                ) : (
                  <ul className="divide-y divide-bb-border">
                    {results.map((r) => {
                      const isLinked = selected.resourceIds.includes(r.id);
                      return (
                        <ResourceRow
                          key={r.id}
                          resource={r}
                          action={
                            isLinked ? (
                              <StatusBadge status="returned" label="Linked" />
                            ) : (
                              <Button size="sm" onClick={() => toggleLink(r.id)}>
                                <Icon name="plus" size={16} /> Link
                              </Button>
                            )
                          }
                        />
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="mt-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Your assignments</h2>
            <Button onClick={() => toast({ title: 'Coming soon', description: "Creating assignments isn't available yet." })}>
              <Icon name="plus" size={18} /> Create assignment
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {assignments.map((a) => (
              <article key={a.id} className="flex flex-col rounded-[18px] bg-bb-surface p-5 shadow-e1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold leading-snug">{a.title}</h3>
                  {a.status === 'draft' ? <Chip>Draft</Chip> : <StatusBadge status="returned" label="Published" />}
                </div>
                <p className="mt-0.5 text-[13px] font-semibold text-bb-accent-ink">{a.className}</p>
                <p className="mt-3 line-clamp-2 flex-1 text-sm text-bb-muted">{a.description}</p>
                <div className="mt-4 flex items-center justify-between border-t border-bb-border pt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-bb-muted">
                    <Icon name="calendar" size={16} /> Due {a.dueDate.toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Icon name="library" size={16} /> {a.resourceIds.length} resources
                  </span>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

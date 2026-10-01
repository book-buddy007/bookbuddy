'use client';

import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type BBIconName } from '@/components/ui/icon';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const guidelines: { icon: BBIconName; title: string; body: string }[] = [
  {
    icon: 'check-circle',
    title: 'Data quality',
    body: 'Ensure your data is clean and complete before uploading. Missing or invalid data may cause your upload to fail.',
  },
  {
    icon: 'pdf',
    title: 'Spreadsheet formatting',
    body: 'Always use the provided templates. Changing column order or names will cause validation errors.',
  },
  {
    icon: 'alert',
    title: 'Large uploads',
    body: 'For very large datasets (1000+ records), consider splitting into multiple files to improve processing speed.',
  },
  {
    icon: 'copy',
    title: 'Duplicate management',
    body: 'Records with matching unique identifiers (ISBN, Student ID) will update existing entries rather than create duplicates.',
  },
];

export default function BulkUploadPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Librarian"
        title="Bulk upload"
        description="Import multiple books or student records using Excel spreadsheets."
        actions={<Chip icon="info">Not available yet</Chip>}
      />

      <Tabs defaultValue="books" className="space-y-6">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
          <EmptyState
            icon="upload"
            title="Book import is on its way"
            description="Spreadsheet import for books isn't available yet. Use Cataloging to add books one at a time."
          />
        </TabsContent>

        <TabsContent value="students">
          <EmptyState
            icon="upload"
            title="Student import is on its way"
            description="Spreadsheet import for student records isn't available yet."
          />
        </TabsContent>
      </Tabs>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">Bulk upload guidelines</h2>
          <p className="text-[13px] text-bb-muted">What to prepare so imports succeed once they're available</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {guidelines.map((g) => (
            <article key={g.title} className="flex gap-4 rounded-[18px] bg-bb-surface p-5 shadow-e1">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft">
                <Icon name={g.icon} size={22} />
              </span>
              <div>
                <h3 className="font-semibold">{g.title}</h3>
                <p className="mt-1 text-sm text-bb-muted">{g.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

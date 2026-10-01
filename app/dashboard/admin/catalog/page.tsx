'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type BBIconName } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { catalogKeys } from "@/lib/query-keys";

// Types
export interface PendingBook {
  id: string | number;
  title: string;
  author: string;
  isbn?: string;
  format?: string;
  submittedBy?: string;
  submittedDate?: string;
  status: string;
}

export interface Genre {
  id: string | number;
  name: string;
  count: number;
}

export interface Subject {
  id: string | number;
  name: string;
  count: number;
}

// Book Approval Components
const ApprovalWorkflow = ({ pendingBooks, onApprove, onReject }: {
  pendingBooks: PendingBook[];
  onApprove: (id: string | number) => void;
  onReject: (book: PendingBook) => void;
}) => {
  if (pendingBooks.length === 0) {
    return (
      <EmptyState
        icon="check-circle"
        title="Nothing awaiting approval"
        description="Books submitted for review will show up here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {pendingBooks.map((book) => (
        <article
          key={book.id}
          className="flex flex-col gap-4 rounded-[18px] bg-bb-surface p-4 shadow-e1 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug">{book.title}</h3>
            <p className="text-[13px] text-bb-muted">by {book.author}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip>ISBN {book.isbn}</Chip>
              <Chip>{book.format || 'Physical'}</Chip>
              <StatusBadge status="pending" label={book.status === 'DRAFT' ? 'Draft' : book.status} />
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" onClick={() => onApprove(book.id)}>
              <Icon name="check" size={16} /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => onReject(book)}>
              <Icon name="close" size={16} /> Reject
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
};

// Shared list for categories and tags
const TaxonomyList = ({ title, noun, icon, items, onAdd, onEdit, onDelete }: {
  title: string;
  noun: string;
  icon: BBIconName;
  items: (Genre | Subject)[];
  onAdd: () => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}) => (
  <div>
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="font-display text-lg font-extrabold tracking-[-0.02em]">{title}</h3>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Icon name="plus" size={16} /> Add {noun}
      </Button>
    </div>

    {items.length === 0 ? (
      <EmptyState
        icon={icon}
        title={`No ${noun}s defined yet`}
        action={
          <Button size="sm" onClick={onAdd}>
            <Icon name="plus" size={16} /> Add your first {noun}
          </Button>
        }
      />
    ) : (
      <ul className="divide-y divide-bb-border overflow-hidden rounded-[18px] bg-bb-surface shadow-e1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <span className="font-semibold">{item.name}</span>
              <span className="ml-2 text-xs text-bb-muted">{item.count} books</span>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item.id)} aria-label={`Edit ${item.name}`}>
                <Icon name="edit" size={16} />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`}>
                <Icon name="trash" size={16} />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default function AdminCatalogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookToReject, setBookToReject] = useState<PendingBook | null>(null);

  // Fetch pending approvals (books in 'DRAFT' status)
  const { data: pendingBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: catalogKeys.bookList({ status: 'DRAFT' }),
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/books?status=DRAFT');
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data.data.map((b: any) => ({
          id: b.id,
          title: b.title,
          author: b.author || "Unknown",
          isbn: b.isbn || "N/A",
          status: b.status
        })) as PendingBook[];
      } catch (e) {
        return [] as PendingBook[];
      }
    }
  });

  // Fetch categories (genres)
  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/taxonomy/categories');
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data.map((c: any) => ({
          id: c.id,
          name: c.name,
          count: c._count?.books || 0
        })) as Genre[];
      } catch (e) {
        return [] as Genre[];
      }
    }
  });

  // Fetch tags (subjects)
  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: catalogKeys.tags(),
    queryFn: async () => {
      try {
        const res = await fetch('/api/v1/taxonomy/tags');
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data.map((t: any) => ({
          id: t.id,
          name: t.name,
          count: t._count?.books || 0
        })) as Subject[];
      } catch (e) {
        return [] as Subject[];
      }
    }
  });

  const isLoading = loadingBooks || loadingCats || loadingTags;

  const approveMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await fetch(`/api/v1/books/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PUBLISHED' })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.books() });
      toast({ title: "Book Approved", description: "The book has been published." });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await fetch(`/api/v1/books/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.books() });
      toast({ title: "Book Rejected", description: "The book request has been archived." });
    }
  });

  const handleAddGenre = () => toast({ title: "Feature Coming Soon", description: "Taxonomy creation in next version." });
  const handleEditGenre = () => toast({ title: "Feature Coming Soon", description: "Taxonomy edit in next version." });
  const handleDeleteGenre = () => toast({ title: "Feature Coming Soon", description: "Taxonomy delete in next version." });

  return (
    <div className="space-y-8">
      <PageHeader
        className="mb-0"
        eyebrow="Admin"
        title="Library oversight"
        description="Manage book approvals, categories, and tags."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          variant="featured"
          title="Pending approvals"
          value={pendingBooks.length}
          description="Books awaiting review"
          icon="check-circle"
          loading={isLoading}
        />
        <StatCard title="Total categories" value={categories.length} description="Active categorizations" icon="layers" loading={isLoading} />
        <StatCard title="Total tags" value={tags.length} description="Defined tags" icon="tag" loading={isLoading} />
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="approvals">Pending approvals</TabsTrigger>
          <TabsTrigger value="genres">Categories</TabsTrigger>
          <TabsTrigger value="subjects">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-0">
          <ApprovalWorkflow
            pendingBooks={pendingBooks}
            onApprove={(id) => approveMutation.mutate(id)}
            onReject={setBookToReject}
          />
        </TabsContent>

        <TabsContent value="genres" className="mt-0">
          <TaxonomyList
            title="Category hierarchy"
            noun="category"
            icon="layers"
            items={categories}
            onAdd={handleAddGenre}
            onEdit={handleEditGenre}
            onDelete={handleDeleteGenre}
          />
        </TabsContent>

        <TabsContent value="subjects" className="mt-0">
          <TaxonomyList
            title="Tag taxonomy"
            noun="tag"
            icon="tag"
            items={tags}
            onAdd={handleAddGenre}
            onEdit={handleEditGenre}
            onDelete={handleDeleteGenre}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!bookToReject} onOpenChange={(open) => !open && setBookToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this book?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-bb-text">{bookToReject?.title}</span> will be removed from the review queue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bb-danger text-white hover:brightness-95"
              onClick={() => {
                if (bookToReject) rejectMutation.mutate(bookToReject.id);
                setBookToReject(null);
              }}
            >
              Reject book
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

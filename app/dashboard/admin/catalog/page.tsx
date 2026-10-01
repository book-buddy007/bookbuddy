'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/admin/shared/SectionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { Button } from "@/components/ui/button";
import { Check, X, Plus, Edit, Trash2, FolderTree, CheckSquare, BookOpen, TrendingUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LoadingSkeleton } from "@/components/admin/shared/Skeleton";
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
  onReject: (id: string | number) => void;
}) => {
  if (pendingBooks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No pending books awaiting approval</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingBooks.map((book) => (
        <EnhancedCard key={book.id} variant="elevated" className="overflow-hidden border-l-4 border-blue-600 dark:border-blue-500">
          <EnhancedCardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-lg bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
                  {book.title}
                </h3>
                <p className="text-muted-foreground">by {book.author}</p>
                <div className="grid grid-cols-2 gap-x-8 mt-3 text-sm">
                  <div className="space-y-1">
                    <p><span className="font-medium text-blue-700 dark:text-blue-500">ISBN:</span> {book.isbn}</p>
                    <p><span className="font-medium text-blue-700 dark:text-blue-500">Format:</span> {book.format || 'Physical'}</p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="font-medium text-teal-600 dark:text-teal-500">Status:</span> {book.status}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  className="text-vg-success-600 hover:text-vg-success-700 hover:bg-vg-success-50 dark:hover:bg-vg-success-900/20"
                  onClick={() => onApprove(book.id)}
                  icon={<Check className="h-4 w-4" />}
                >
                  Approve
                </EnhancedButton>
                <EnhancedButton
                  variant="outline"
                  size="sm"
                  className="text-vg-error-600 hover:text-vg-error-700 hover:bg-vg-error-50 dark:hover:bg-vg-error-900/20"
                  onClick={() => onReject(book.id)}
                  icon={<X className="h-4 w-4" />}
                >
                  Reject
                </EnhancedButton>
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      ))}
    </div>
  );
};

// Genre Management Components
const GenreTreeEditor = ({ genres, onAdd, onEdit, onDelete }: {
  genres: Genre[];
  onAdd: () => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent">
          Category Hierarchy
        </h3>
        <EnhancedButton variant="outline" size="sm" onClick={onAdd} icon={<Plus className="h-4 w-4" />}>
          Add Category
        </EnhancedButton>
      </div>

      {genres.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderTree className="h-16 w-16 mx-auto mb-3 text-vg-primary-300 dark:text-vg-primary-700" />
          <p className="text-lg mb-3">No categories defined yet</p>
          <EnhancedButton variant="vg-primary" size="sm" onClick={onAdd} icon={<Plus className="h-4 w-4" />}>
            Add your first category
          </EnhancedButton>
        </div>
      ) : (
        <div className="space-y-2">
          {genres.map((genre) => (
            <div key={genre.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
              <div>
                <span className="font-medium">{genre.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {genre.count} books
                </span>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(genre.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(genre.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Subject Management Components
const SubjectTaxonomyManager = ({ subjects, onAdd, onEdit, onDelete }: {
  subjects: Subject[];
  onAdd: () => void;
  onEdit: (id: string | number) => void;
  onDelete: (id: string | number) => void;
}) => {
  return (
    <div>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-medium">Tag Taxonomy</h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Tag
        </Button>
      </div>
      
      {subjects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CheckSquare className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
          <p>No tags defined yet</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" /> Add your first tag
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md">
              <div>
                <span className="font-medium">{subject.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {subject.count} books
                </span>
              </div>
              <div className="flex space-x-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(subject.id)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(subject.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function AdminCatalogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("approvals");

  // Fetch pending approvals (books mapping to 'DRAFT' status as mock)
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
    <div className="p-6 space-y-8 animate-vg-fade-in">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-700 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
          <BookOpen className="h-10 w-10 text-blue-700 dark:text-blue-500" />
          Library Management
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage book approvals, categories, and tags
        </p>
      </div>

      <LoadingSkeleton loading={isLoading}>
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Pending Approvals"
            value={pendingBooks.length.toString()}
            description="Books awaiting review"
            icon={CheckSquare}
            iconColor="text-vg-warning-600"
            iconBgColor="bg-vg-warning-50 dark:bg-vg-warning-900/20"
            variant="warning"
          />
          <StatCard
            title="Total Categories"
            value={categories.length.toString()}
            description="Active categorizations"
            icon={FolderTree}
            iconColor="text-blue-700 dark:text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-900/20"
            variant="primary"
          />
          <StatCard
            title="Total Tags"
            value={tags.length.toString()}
            description="Defined tags"
            icon={CheckSquare}
            iconColor="text-teal-600 dark:text-teal-500"
            iconBgColor="bg-teal-50 dark:bg-teal-900/20"
            variant="cultural"
          />
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="approvals" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md shadow-vg-md border border-gray-200/50 dark:border-gray-700/50">
            <TabsTrigger value="approvals" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white">
              Pending Approvals
            </TabsTrigger>
            <TabsTrigger value="genres" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white">
              Categories
            </TabsTrigger>
            <TabsTrigger value="subjects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-vg-primary-500 data-[state=active]:to-vg-sanskrit-500 data-[state=active]:text-white">
              Tags
            </TabsTrigger>
          </TabsList>

          <EnhancedCard variant="elevated">
            <EnhancedCardContent className="p-6">
              <TabsContent value="approvals" className="mt-0">
                <ApprovalWorkflow
                  pendingBooks={pendingBooks}
                  onApprove={(id) => approveMutation.mutate(id)}
                  onReject={(id) => rejectMutation.mutate(id)}
                />
              </TabsContent>

              <TabsContent value="genres" className="mt-0">
                <GenreTreeEditor
                  genres={categories}
                  onAdd={handleAddGenre}
                  onEdit={handleEditGenre}
                  onDelete={handleDeleteGenre}
                />
              </TabsContent>

              <TabsContent value="subjects" className="mt-0">
                <SubjectTaxonomyManager
                  subjects={tags}
                  onAdd={handleAddGenre}
                  onEdit={handleEditGenre}
                  onDelete={handleDeleteGenre}
                />
              </TabsContent>
            </EnhancedCardContent>
          </EnhancedCard>
        </Tabs>
      </LoadingSkeleton>
    </div>
  );
}

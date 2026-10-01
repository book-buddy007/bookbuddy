'use client';

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/lib/apiClient";
import { EnhancedButton } from "@/components/ui/enhanced-button";
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { StatCard } from "@/components/ui/stat-card";
import { Input } from "@/components/ui/input";
import { Search, BookOpen, Clock, Library, BookMarked, AlertTriangle } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import adminStyles from "@/app/admin.module.css";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { isAuthenticated } = useAuthStore();

  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const res = await apiClient.get('/library/borrowed');
        setBorrowedBooks(res.data || []);
      } catch (err) {
        console.error("Failed to fetch borrowed books", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBooks();
  }, [isAuthenticated]);

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 text-bb-accent">
            <Library className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            Personal Library
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Manage your borrowed books and track due dates
          </p>
        </div>
        <EnhancedButton
          className="shadow-lg hover:shadow-xl border-transparent"
          icon={<BookOpen className="h-4 w-4" />}
          onClick={() => window.location.href = "/catalog"}
        >
          Browse Library
        </EnhancedButton>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Books Borrowed"
          value={borrowedBooks.length.toString()}
          description={`${borrowedBooks.filter(b => b.book?.format === "Physical").length} physical, ${borrowedBooks.filter(b => b.book?.format !== "Physical").length} digital`}
          icon={BookOpen}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
          variant="primary"
        />
        <StatCard
          title="Due Soon"
          value={borrowedBooks.filter(b => (new Date(b.dueDate).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000).length.toString()}
          description="Within 3 days"
          icon={Clock}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-900/20"
          variant="warning"
        />
        <StatCard
          title="Overdue"
          value={borrowedBooks.filter(b => new Date(b.dueDate).getTime() < new Date().getTime()).length.toString()}
          description="Requires attention"
          icon={AlertTriangle}
          iconColor="text-red-600 dark:text-red-400"
          iconBgColor="bg-red-50 dark:bg-red-900/20"
          variant="error"
        />
      </div>

      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <EnhancedCardTitle className="text-xl flex items-center gap-2 text-bb-accent">
                <BookMarked className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                Borrowed Books
              </EnhancedCardTitle>
              <EnhancedCardDescription className="text-slate-600 dark:text-slate-400 mt-1">
                View and manage your currently borrowed books
              </EnhancedCardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search your books..."
                className="pl-9 h-11 rounded-lg border-indigo-200/40 dark:border-indigo-900/30 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10">
          <div className="rounded-lg border border-indigo-200/40 dark:border-indigo-900/30 overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-indigo-50/50 dark:bg-indigo-900/20">
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Title</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Format</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Borrowed On</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Due Date</TableHead>
                  <TableHead className="whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Status</TableHead>
                  <TableHead className="text-right whitespace-nowrap font-semibold text-indigo-900 dark:text-indigo-100">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6">Loading books...</TableCell></TableRow>
                ) : borrowedBooks.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-slate-500">You haven't borrowed any books yet.</TableCell></TableRow>
                ) : borrowedBooks.map((borrowed) => {
                  const isOverdue = new Date(borrowed.dueDate).getTime() < new Date().getTime();
                  const isDueSoon = new Date(borrowed.dueDate).getTime() - new Date().getTime() < 3 * 24 * 60 * 60 * 1000;
                  return (
                    <TableRow key={borrowed.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                      <TableCell className="font-medium whitespace-nowrap text-slate-900 dark:text-white">{borrowed.book?.title}</TableCell>
                      <TableCell>
                        <Badge variant={borrowed.book?.format === "Physical" ? "secondary" : "outline"} className={borrowed.book?.format === "Physical" ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : ""}>
                          {borrowed.book?.format || 'Digital'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-slate-600 dark:text-slate-400">{new Date(borrowed.borrowedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap text-slate-600 dark:text-slate-400">{new Date(borrowed.dueDate).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={isOverdue ? "destructive" : isDueSoon ? "outline" : "default"}
                          className={
                            !isOverdue && !isDueSoon
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0"
                              : isOverdue ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0"
                          }
                        >
                          {isOverdue ? "Overdue" : isDueSoon ? "Due Soon" : "On Time"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <EnhancedButton
                            size="sm"
                            variant="outline"
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                            onClick={() => {
                              if (borrowed.book?.format === "Physical") {
                                alert("Taking you to return modal");
                              } else {
                                window.location.href = "/reader";
                              }
                            }}
                          >
                            {borrowed.book?.format === "Physical" ? "Return" : "Read"}
                          </EnhancedButton>
                          <EnhancedButton size="sm" variant="ghost" className="text-slate-600 hover:text-indigo-600 hover:bg-indigo-50">
                            Renew
                          </EnhancedButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    </div>
  );
}
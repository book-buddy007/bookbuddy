'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from '@/components/ui/enhanced-card';
import { StatCard } from '@/components/ui/stat-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Search, BookMarked, Star, ChevronRight, Trash2, CheckCircle2, Bookmark, BookmarkCheck, BookmarkX } from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox as CheckboxComponent } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import adminStyles from "@/app/admin.module.css";

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  format: string;
  rating: number;
  status: string;
  progress: number;
  addedDate: string;
  targetDate: string;
  totalPages?: number;
}

interface BookNote {
  page: number;
  content: string;
  timestamp: string;
}

export default function ReadingListPage() {
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bookmarks, setBookmarks] = useState<Record<string, number[]>>({});
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bookNotes, setBookNotes] = useState<Record<string, BookNote[]>>({});

  const [readingList, setReadingList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSavedBooks = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const response = await apiClient.get('/library/saved');
        setReadingList(response.data || []);
      } catch (err) {
        console.error("Failed to fetch reading list:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSavedBooks();
  }, [isAuthenticated]);
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'reading':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 border-transparent">Reading</Badge>;
      case 'planned':
        return <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 border-transparent">Planned</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 border-transparent">Completed</Badge>;
      default:
        return null;
    }
  };

  const ReadingInterface = ({ book }: { book: Book }) => {
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [notes, setNotes] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const [showAllNotes, setShowAllNotes] = useState(false);

    const handleBookmark = () => {
      setIsBookmarked(!isBookmarked);
      if (!isBookmarked) {
        setBookmarks(prev => ({
          ...prev,
          [book.id]: [...(prev[book.id] || []), currentPage]
        }));
      } else {
        setBookmarks(prev => ({
          ...prev,
          [book.id]: (prev[book.id] || []).filter(page => page !== currentPage)
        }));
      }
    };

    const handleSaveNote = () => {
      if (notes.trim()) {
        const newNote: BookNote = {
          page: currentPage,
          content: notes,
          timestamp: new Date().toISOString()
        };
        setBookNotes(prev => ({
          ...prev,
          [book.id]: [...(prev[book.id] || []), newNote]
        }));
        setNotes('');
        setShowNotes(false);
      }
    };

    const getCurrentPageNotes = () => {
      return (bookNotes[book.id] || []).filter(note => note.page === currentPage);
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{book.title}</h2>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{book.author}</p>
          </div>
          <div className="flex gap-2">
            <EnhancedButton variant="outline" size="sm" onClick={handleBookmark} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              {isBookmarked ? (
                <BookmarkCheck className="h-4 w-4 mr-2" />
              ) : (
                <Bookmark className="h-4 w-4 mr-2" />
              )}
              {isBookmarked ? 'Bookmarked' : 'Bookmark'}
            </EnhancedButton>
            <EnhancedButton variant="outline" size="sm" onClick={() => setShowNotes(!showNotes)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              <BookmarkX className="h-4 w-4 mr-2" />
              Notes
            </EnhancedButton>
            <EnhancedButton variant="outline" size="sm" onClick={() => setShowAllNotes(!showAllNotes)} className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              All Notes
            </EnhancedButton>
          </div>
        </div>

        <div className="border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-6 min-h-[400px] bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
          {/* Abstract book decoration */}
          <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-indigo-50/50 dark:from-indigo-900/10 to-transparent pointer-events-none" />

          <div className="relative z-10">
            {/* This would be replaced with actual book content */}
            <p className="text-lg text-slate-700 dark:text-slate-300">Page {currentPage} content goes here...</p>

            {/* Display notes for current page */}
            {getCurrentPageNotes().length > 0 && (
              <div className="mt-8 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                <h3 className="font-semibold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center">
                  <Bookmark className="h-4 w-4 mr-2" />
                  Notes for this page
                </h3>
                <div className="space-y-3">
                  {getCurrentPageNotes().map((note, index) => (
                    <div key={index} className="p-3 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-100 dark:border-slate-700">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        {new Date(note.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {showNotes && (
          <div className="space-y-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
            <h3 className="font-medium text-indigo-800 dark:text-indigo-300">Add Note for Page {currentPage}</h3>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your notes here..."
              className="min-h-[100px] bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800"
            />
            <div className="flex justify-end gap-2">
              <EnhancedButton variant="outline" size="sm" onClick={() => setShowNotes(false)}>
                Cancel
              </EnhancedButton>
              <EnhancedButton size="sm" onClick={handleSaveNote} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Save Note
              </EnhancedButton>
            </div>
          </div>
        )}

        {showAllNotes && (
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">All Notes</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {(bookNotes[book.id] || []).length === 0 ? (
                <p className="text-sm text-slate-500 italic">No notes created yet.</p>
              ) : (
                (bookNotes[book.id] || []).map((note, index) => (
                  <div key={index} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">Page {note.page}</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(note.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{note.content}</p>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700 mt-2">
              <EnhancedButton variant="outline" size="sm" onClick={() => setShowAllNotes(false)}>
                Close
              </EnhancedButton>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center py-2">
          <EnhancedButton
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-slate-200"
          >
            Previous
          </EnhancedButton>
          <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            Page {currentPage} of {book.totalPages || 100}
          </span>
          <EnhancedButton
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === (book.totalPages || 100)}
            className="border-slate-200"
          >
            Next
          </EnhancedButton>
        </div>
      </div>
    );
  };

  const handleBulkSelect = (bookId: string) => {
    setSelectedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleBulkRemove = () => {
    // In a real app, this would make an API call
    console.log('Removing books:', selectedBooks);
    setSelectedBooks([]);
    setIsBulkMode(false);
  };

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <BookMarked className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            Reading List
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Manage your saved books and track reading progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[180px] border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Books</SelectItem>
              <SelectItem value="reading">Currently Reading</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value= "COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Total Books"
          value={readingList.length.toString()}
          description="Books in your list"
          icon={BookMarked}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
          variant="primary"
        />
        <StatCard
          title="In Progress"
          value={readingList.filter(book => book.status === 'reading').length.toString()}
          description="Books you're reading"
          icon={BookOpen}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-900/20"
          variant="warning"
        />
        <StatCard
          title="Completed"
          value={readingList.filter(book => book.progress >= 100 || book.status === 'COMPLETED').length.toString()}
          description="Books finished"
          icon={CheckCircle2}
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBgColor="bg-emerald-50 dark:bg-emerald-900/20"
          variant="success"
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {isBulkMode && (
            <>
              <EnhancedButton variant="outline" size="sm" onClick={handleBulkRemove} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Selected
              </EnhancedButton>
              <EnhancedButton variant="outline" size="sm" onClick={() => setIsBulkMode(false)}>
                Cancel
              </EnhancedButton>
            </>
          )}
        </div>
        <EnhancedButton
          variant={isBulkMode ? "default" : "outline"}
          size="sm"
          onClick={() => setIsBulkMode(!isBulkMode)}
          className={isBulkMode ? "bg-indigo-600 hover:bg-indigo-700 text-white" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}
        >
          {isBulkMode ? 'Exit Bulk Mode' : 'Bulk Actions'}
        </EnhancedButton>
      </div>

      <EnhancedCard variant="elevated" className={adminStyles.scallopedArch}>
        <div className={adminStyles.archMotif} />
        <EnhancedCardHeader className="relative z-10 pb-2">
          <EnhancedCardTitle className="text-xl flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your Reading List
          </EnhancedCardTitle>
          <EnhancedCardDescription className="text-slate-600 dark:text-slate-400">Track your reading progress and manage your books</EnhancedCardDescription>
        </EnhancedCardHeader>
        <EnhancedCardContent className="relative z-10">
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search your reading list..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/50 dark:bg-slate-900/50 border-indigo-200/50 focus:border-indigo-500"
              />
            </div>
            <EnhancedButton className="!bg-gradient-to-r !from-indigo-600 !to-indigo-500 hover:!from-indigo-700 hover:!to-indigo-600 !text-white border-transparent">
              Search
            </EnhancedButton>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading your reading list...</div>
            ) : readingList.length === 0 ? (
              <div className="text-center py-8 text-slate-500">Your reading list is empty. Go browse the library!</div>
            ) : readingList.map((item) => {
              const book = item.book || item; // Fallback mapping
              return (
                <div key={item.id} className="flex flex-col sm:flex-row gap-5 p-5 border border-indigo-100 dark:border-indigo-900/30 rounded-xl bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-shadow">
                  {isBulkMode && (
                    <div className="flex items-center">
                      <CheckboxComponent
                        checked={selectedBooks.includes(item.id)}
                        onCheckedChange={() => handleBulkSelect(item.id)}
                        className="border-indigo-300 text-indigo-600 focus:ring-indigo-500 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </div>
                  )}
                  <div className="w-full sm:w-28 h-40 sm:h-auto bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} className="w-full h-full object-cover" alt={book.title} />
                    ) : (
                      <BookOpen className="h-10 w-10 text-indigo-300 dark:text-indigo-700" />
                    )}
                  </div>
                  <div className="flex-1 space-y-3 py-1">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{book.title}</h3>
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{book.rating || "4.5"}</span>
                        </div>
                        {getStatusBadge(item.status || 'reading')}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">{book.genre || 'General'}</Badge>
                      <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{book.format || 'Digital'}</Badge>
                    </div>
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-600 dark:text-slate-400">Progress: {item.progress || 0}%</span>
                        <span className="text-slate-500 flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs">
                          Added: {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <Progress value={item.progress || 0} className="h-2.5 bg-indigo-100 dark:bg-indigo-900/30" />
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <EnhancedButton
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBook(book)}
                        className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                      >
                        <ChevronRight className="mr-1.5 h-4 w-4" />
                        Continue Reading
                      </EnhancedButton>
                      <EnhancedButton variant="ghost" size="sm" className="text-slate-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="mr-1.5 h-4 w-4" />
                        Remove
                      </EnhancedButton>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </EnhancedCardContent>
      </EnhancedCard>

      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Reading Interface</DialogTitle>
          </DialogHeader>
          {selectedBook && <ReadingInterface book={selectedBook} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
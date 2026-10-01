'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/lib/apiClient';
import { useAuthStore } from '@/store/useAuthStore';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { EnhancedCard, EnhancedCardContent, EnhancedCardDescription, EnhancedCardHeader, EnhancedCardTitle } from '@/components/ui/enhanced-card';
import { StatCard } from '@/components/ui/stat-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Sparkles, Star, ChevronRight, BookMarked } from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import adminStyles from "@/app/admin.module.css";

export default function RecommendationsPage() {
  const { isAuthenticated } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('all');

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [trendingBooks, setTrendingBooks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      if (!isAuthenticated) return;
      setIsLoading(true);
      try {
        const [recsRes, trendsRes] = await Promise.all([
          apiClient.get('/books/recommendations').catch(() => ({ data: [] })),
          apiClient.get('/books/trending').catch(() => ({ data: [] }))
        ]);
        setRecommendations(recsRes.data || []);
        setTrendingBooks(trendsRes.data || []);
      } catch (error) {
        console.error("Failed to fetch discovery data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiscoveryData();
  }, [isAuthenticated]);

  return (
    <div className="space-y-8 animate-vg-fade-in relative z-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
            Book Recommendations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Discover personalized book suggestions based on your interests
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px] border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="computer-science">Computer Science</SelectItem>
              <SelectItem value="psychology">Psychology</SelectItem>
              <SelectItem value="mathematics">Mathematics</SelectItem>
              <SelectItem value="literature">Literature</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger className="w-[180px] border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500">
              <SelectValue placeholder="Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Formats</SelectItem>
              <SelectItem value="physical">Physical Books</SelectItem>
              <SelectItem value="e-book">E-books</SelectItem>
              <SelectItem value="audio">Audiobooks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Recommendations"
          value={recommendations.length.toString()}
          description="Personalized for you"
          icon={Sparkles}
          iconColor="text-indigo-600 dark:text-indigo-400"
          iconBgColor="bg-indigo-50 dark:bg-indigo-900/20"
          variant="primary"
        />
        <StatCard
          title="Trending Books"
          value={trendingBooks.length.toString()}
          description="Popular this week"
          icon={Star}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-50 dark:bg-purple-900/20"
          variant="info"
        />
        <StatCard
          title="Avg Rating"
          value="4.6"
          description="Recommended books"
          icon={Star}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBgColor="bg-amber-50 dark:bg-amber-900/20"
          variant="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 xl:grid-cols-2">
        <EnhancedCard variant="elevated" className={`xl:col-span-1 border-indigo-100 dark:border-indigo-900/30 ${adminStyles.scallopedArch}`}>
          <div className={adminStyles.archMotif} />
          <EnhancedCardHeader className="relative z-10 pb-2">
            <EnhancedCardTitle className="text-xl flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Personalized for You
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-slate-600 dark:text-slate-400 mt-1">
              Selected based on your reading history and interests
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent className="relative z-10">
            <div className="space-y-5 pt-2">
              {isLoading ? (
                <div className="text-center py-6 text-slate-500">Generating hyper-personalized recommendations...</div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-6 text-slate-500">Not enough history to generate recommendations yet.</div>
              ) : recommendations.map((book) => (
                <div key={book.id} className="group flex flex-col sm:flex-row gap-5 p-5 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm hover:shadow hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300">
                  <div className="w-full sm:w-28 h-40 sm:h-36 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-100/50 dark:border-indigo-800/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {book.coverUrl ? (
                      <img src={book.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={book.title} />
                    ) : (
                      <BookOpen className="h-10 w-10 text-indigo-300 dark:text-indigo-700 group-hover:scale-110 transition-transform duration-500" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{book.title}</h3>
                        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">{book.author}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md shrink-0">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{book.rating || "4.5"}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-transparent">{book.category || 'General'}</Badge>
                      <Badge variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">{book.format || 'Digital'}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 my-2 line-clamp-2">{book.description || 'A recommended book based on your learning profile.'}</p>
                    <div className="flex items-start gap-2 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/10 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/20">
                      <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="leading-snug">{book.reason || 'Recommended by Advanced AI Algorithms.'}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <EnhancedButton variant="outline" size="sm" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
                        <BookMarked className="mr-1.5 h-3.5 w-3.5" />
                        Save
                      </EnhancedButton>
                      <EnhancedButton size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md border-transparent">
                        <ChevronRight className="mr-1 h-4 w-4" />
                        Details
                      </EnhancedButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </EnhancedCardContent>
        </EnhancedCard>

        <EnhancedCard variant="elevated" className={`xl:col-span-1 border-purple-100 dark:border-purple-900/30 ${adminStyles.scallopedArch}`}>
          <div className={adminStyles.archMotif} />
          <EnhancedCardHeader className="relative z-10 pb-2">
            <EnhancedCardTitle className="text-xl flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Trending Now
            </EnhancedCardTitle>
            <EnhancedCardDescription className="text-slate-600 dark:text-slate-400 mt-1">
              Popular books among students this week
            </EnhancedCardDescription>
          </EnhancedCardHeader>
          <EnhancedCardContent className="relative z-10">
            <div className="space-y-4 pt-2">
              {isLoading ? (
                <div className="text-center py-6 text-slate-500">Loading trending books...</div>
              ) : trendingBooks.length === 0 ? (
                <div className="text-center py-6 text-slate-500">No trending books available right now.</div>
              ) : trendingBooks.map((book) => (
                <div key={book.id} className="group flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm hover:shadow hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-16 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg flex items-center justify-center border border-purple-100 dark:border-purple-800/50 shrink-0 overflow-hidden">
                      {book.coverUrl ? (
                        <img src={book.coverUrl} className="w-full h-full object-cover" alt={book.title} />
                      ) : (
                        <BookOpen className="h-6 w-6 text-purple-400 dark:text-purple-600 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">{book.title}</h3>
                      <p className="text-sm font-medium text-purple-600/80 dark:text-purple-400/80 mt-0.5">{book.author}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="secondary" className="bg-indigo-600 text-white border-transparent shadow-sm">
                      #{book.trendingRank || Math.floor(Math.random() * 10) + 1} Trend
                    </Badge>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{book.rating || "4.8"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                Find Specific Topic
              </h3>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Search titles, authors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-4 pr-10 bg-white/50 dark:bg-slate-900/50 border-purple-200/50 focus:border-purple-500"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                <EnhancedButton className="!bg-gradient-to-r !from-purple-600 !to-indigo-600 hover:!from-purple-700 hover:!to-indigo-700 !text-white shadow-md sm:w-auto w-24">
                  Explore
                </EnhancedButton>
              </div>
            </div>
          </EnhancedCardContent>
        </EnhancedCard>
      </div>
    </div>
  );
}
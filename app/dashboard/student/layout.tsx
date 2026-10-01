'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import apiClient from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  BookOpen,
  LibraryBig,
  BookMarked,
  Sparkles,
  Highlighter,
  Headphones,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  User,
  GraduationCap,
  Brain,
} from '@/components/ui/icons';

/* ───── Nav items ───── */
interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

// Library = the shared book collection (browse/borrow) → bookshelf icon.
// My Shelf = the student's OWN uploaded PDFs (was confusingly called "Library").
//
// Review is BACK. It was dropped on the grounds that it "opened a blank page",
// but that was wrong: it renders the forgetting-aware resurfacing queue from
// /students/me/resurfacing-queue with real rows. With no link anywhere, the
// backend scheduled ResurfacingEvents nightly that no student could ever see —
// the whole user-facing half of that feature was dark.
const NAV_ITEMS: NavItem[] = [
  { name: 'Home',      href: '/dashboard/student',                  icon: LayoutDashboard },
  { name: 'Library',   href: '/catalog',                            icon: LibraryBig },
  { name: 'My Shelf',  href: '/dashboard/student/personal-library', icon: BookMarked },
  { name: 'Reader',    href: '/reader',                              icon: BookOpen },
  { name: 'Sanchika',  href: '/reader?tab=sanchika',                 icon: Highlighter },
  { name: 'Varta',  href: '/reader?tab=varta',                    icon: Sparkles },
  { name: 'Review',    href: '/dashboard/student/review',            icon: Brain },
  { name: 'Audio',     href: '/catalog?format=AUDIOBOOK',            icon: Headphones },
];

const BOTTOM_TABS: NavItem[] = [
  { name: 'Home',     href: '/dashboard/student',   icon: LayoutDashboard },
  { name: 'Library',  href: '/catalog',             icon: LibraryBig },
  { name: 'Sanchika', href: '/reader?tab=sanchika', icon: Highlighter },
  { name: 'Profile',  href: '/dashboard/student/profile', icon: User },
];

/* ───── Layout Shell ───── */
export default function StudentDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Notifications
  useEffect(() => {
    if (user) {
      apiClient.get('/notifications')
        .then(res => {
          const data = res.data?.data || res.data || [];
          setNotifications(data);
          // Use the count the API computes. The previous line filtered on
          // `n.read`, but Prisma's field is `isRead` — so `!n.read` was true
          // for every row and the badge showed the TOTAL, never the unread
          // count.
          setUnreadCount(
            typeof res.data?.unreadCount === 'number'
              ? res.data.unreadCount
              : data.filter((n: any) => !n.isRead).length,
          );
        })
        .catch(() => {
          // Fallback to initial messages if API is not yet ready
          setNotifications([
            { id: 1, title: 'Welcome to Book Buddy! 🎉', message: 'Explore the library to borrow your first book.', isRead: false },
            { id: 2, title: 'New books added to the library', message: 'Check out the latest additions to your library.', isRead: true }
          ]);
          setUnreadCount(1);
        });
    }
  }, [user]);

  // Mark one notification read, optimistically. A failure re-throws nothing:
  // the row stays unread on the server and the next fetch corrects the UI.
  const markNotificationRead = async (id: string | number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await apiClient.patch(`/notifications/${id}/read`);
    } catch {
      /* corrected on next load */
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await apiClient.post('/notifications/read-all');
    } catch {
      /* corrected on next load */
    }
  };

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'ST';

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0A0F1E] text-slate-900 dark:text-[var(--ivory-cream)] selection:bg-[var(--deep-saffron)]/30">
      {/* ── Ambient Background Glows ── */}
      <div className="fixed top-0 right-0 -mr-40 w-[800px] h-[800px] bg-gradient-to-bl from-[var(--saffron)]/10 via-[var(--gold)]/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 -ml-40 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--peacock-teal)]/10 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* ── Desktop icon rail sidebar (fixed on left) ── */}
      <nav className="relative z-40 hidden lg:flex w-[72px] shrink-0 flex-col items-center gap-2 py-4 border-r border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-2xl">
        <Link href="/dashboard/student" className="flex items-center justify-center mb-6">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white shadow-sm hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
        </Link>
        <div className="flex-1 flex flex-col items-center gap-1.5 w-full">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard/student' && pathname?.startsWith(item.href.split('?')[0]));
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.name}
                    className={cn(
                      'group flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deep-saffron)]/50',
                      isActive
                        ? 'bg-gradient-to-br from-[var(--deep-saffron)]/15 to-[var(--saffron)]/10 text-[var(--deep-saffron)] shadow-sm ring-1 ring-[var(--deep-saffron)]/20'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5 transition-transform duration-200', isActive && 'scale-110')} />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        {/* Bottom actions */}
        <div className="flex flex-col items-center gap-1.5 pt-3 border-t border-slate-200/60 dark:border-slate-700/40 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/student/profile"
                aria-label="Settings"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deep-saffron)]/50"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Settings
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                aria-label="Logout"
                className="flex h-11 w-11 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Logout
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>

      {/* ── Body wrapper (fills remaining width) ── */}
      <div className="flex flex-col flex-1 min-w-0 w-full relative z-10 overflow-hidden">
        {/* ────────────── HEADER ────────────── */}
        {/* relative z-30 is load-bearing: `backdrop-blur-2xl` makes this header
            its own stacking context, which trapped the notification dropdown's
            z-50 inside it. Without an explicit z above <main>, the page content
            (e.g. the profile hero, itself relative z-10) painted OVER the dropdown
            in DOM order, so the opaque panel appeared to bleed into the page. */}
        <header className="relative z-30 shrink-0 w-full border-b border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-[#0A0F1E]/70 backdrop-blur-2xl shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8 w-full max-w-[1800px] mx-auto h-[60px] sm:h-[68px]">
            {/* Left — Logo + Breadcrumb (Mobile only, Desktop relies on Sidebar) */}
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              <button
                className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Mobile Logo */}
              <Link href="/dashboard/student" className="flex lg:hidden items-center gap-2 group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white shadow-sm">
                  <GraduationCap className="h-4.5 w-4.5" />
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Book Buddy</p>
                </div>
              </Link>

              {/* Desktop Greeting Header Area */}
              <div className="hidden lg:block leading-tight">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Welcome back,</h2>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{user?.name || 'Student'}</h1>
              </div>
            </div>

            {/* Center — Search (desktop)
                Was a bare <input> with no value, no handler and no form — the
                most prominent inert control in the app. It submits to the
                library now, which already accepts and debounces `search`. The
                placeholder promised books, notes AND questions; it says what it
                actually does until the other two are searchable. */}
            <form
              role="search"
              className="hidden md:flex flex-1 max-w-xl mx-6"
              onSubmit={(e) => {
                e.preventDefault();
                const q = searchQuery.trim();
                router.push(q ? `/catalog?search=${encodeURIComponent(q)}` : '/catalog');
              }}
            >
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search the library"
                  placeholder="Search the library…"
                  className="h-10 w-full rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 pl-10 pr-4 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--deep-saffron)]/40 focus:border-[var(--deep-saffron)]/40 transition-all"
                />
              </div>
            </form>

            {/* Right — Notifications + Avatar */}
            <div className="flex items-center gap-3">
              {/* Notification bell with dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((p) => !p)}
                  className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--deep-saffron)] text-[9px] font-bold text-white ring-2 ring-white dark:ring-[#0A0F1E] animate-in fade-in zoom-in">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  /* Mobile: a full-width sheet pinned to the viewport (the header's
                     backdrop-filter is the containing block for `fixed`, and it
                     spans the full width, so left-3/right-3 = screen margins). This
                     replaces `absolute right-0`, which anchored the panel to the
                     bell near the right edge and ran its left side off-screen.
                     sm+: revert to the compact anchored dropdown. */
                  <div className="fixed left-3 right-3 top-[64px] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[380px] rounded-2xl border border-slate-200/60 dark:border-slate-700/40 bg-white dark:bg-[#0F172A] shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-vg-fade-in origin-top-right">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[10px] font-semibold uppercase tracking-wider text-[var(--deep-saffron)] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <button
                            key={n.id}
                            onClick={() => !n.isRead && markNotificationRead(n.id)}
                            className="w-full text-left px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors flex items-start gap-2.5"
                          >
                            {/* Always occupies its slot so read and unread rows
                                keep the same text baseline. */}
                            <span
                              aria-hidden="true"
                              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.isRead ? 'bg-transparent' : 'bg-[var(--deep-saffron)]'}`}
                            />
                            <span className="min-w-0">
                              <span className={`block text-sm font-medium ${n.isRead ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                {n.title}
                              </span>
                              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message || n.body}</span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-5 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                          No notifications yet.
                        </div>
                      )}
                    </div>
                    <Link
                      href="/dashboard/student/profile"
                      onClick={() => setNotifOpen(false)}
                      className="block px-5 py-3 text-center text-xs font-semibold text-[var(--deep-saffron)] hover:bg-slate-50 dark:hover:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 transition-colors"
                    >
                      Manage notification preferences →
                    </Link>
                  </div>
                )}
              </div>

              {/* Avatar → Profile */}
              <Link
                href="/dashboard/student/profile"
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-[var(--deep-saffron)]/20 hover:ring-[var(--deep-saffron)]/50 transition-all shadow-sm hover:scale-105"
                aria-label="Your profile"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage src={user?.avatar || '/placeholder-user.jpg'} />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </div>
          </div>
        </header>

        {/* ────────────── MAIN PAGE SLOT ────────────── */}
        <main className="flex-1 min-h-0 min-w-0 w-full overflow-y-auto pb-20 sm:pb-0">
          <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1800px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ────────────── MOBILE SLIDE-OVER MENU ────────────── */}
      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0F172A] shadow-xl lg:hidden overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <Link href="/dashboard/student" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-white">Book Buddy</span>
              </Link>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            {/* User card */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-[var(--deep-saffron)]/20">
                  <AvatarImage src={user?.avatar || '/placeholder-user.jpg'} />
                  <AvatarFallback className="bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {user?.name || 'Student'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Student</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="p-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                      isActive
                        ? 'sidebar-indic-active'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive && 'text-[var(--deep-saffron)]')} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0F172A]">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>
        </>
      )}

      {/* ────────────── MOBILE BOTTOM TAB BAR ────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-slate-200/60 dark:border-slate-700/40 bg-white/90 dark:bg-[#0A0F1E]/90 backdrop-blur-xl px-1 py-1.5 sm:hidden safe-area-bottom">
        {BOTTOM_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-[10px] font-semibold transition-colors min-h-[44px]',
                isActive
                  ? 'text-[var(--deep-saffron)]'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <tab.icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
    </TooltipProvider>
  );
}

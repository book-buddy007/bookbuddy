'use client';

import type React from "react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Palette,
  History,
  Settings,
  BookOpen,
  LogOut,
  FileAudio,
  Menu,
  X,
  GraduationCap,
  Bell,
  Moon,
  Sun
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useTheme } from "next-themes";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function SuperAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navigationSections: NavSection[] = [
    {
      title: "Core Configuration",
      items: [
        { name: "Dashboard Overview", href: "/dashboard/super-admin", icon: LayoutDashboard },
        { name: "Institutions", href: "/dashboard/super-admin/institution", icon: Building2 },
        { name: "Users", href: "/dashboard/super-admin/users", icon: Users },
      ],
    },
    {
      title: "Settings & Subscriptions",
      items: [
        { name: "Library", href: "/dashboard/super-admin/catalog", icon: BookOpen },
        { name: "Subscriptions", href: "/dashboard/super-admin/subscriptions", icon: CreditCard },
      ],
    },
    {
      title: "Portal Configuration",
      items: [
        { name: "Branding", href: "/dashboard/super-admin/branding", icon: Palette },
        { name: "Storage", href: "/dashboard/super-admin/media", icon: FileAudio },
      ],
    },
    {
      title: "System Administration",
      items: [
        { name: "Audit Logs", href: "/dashboard/super-admin/audit", icon: History },
      ],
    },
  ];

  const getPageTitle = (path: string) => {
    if (path === '/dashboard/super-admin') return 'Dashboard Overview';
    if (path.includes('/institution')) return 'Institutions';
    if (path.includes('/users')) return 'User Management';
    if (path.includes('/catalog')) return 'Library Management';
    if (path.includes('/subscriptions')) return 'Subscriptions';
    if (path.includes('/branding')) return 'Branding';
    if (path.includes('/media')) return 'Storage Analytics';
    if (path.includes('/audit')) return 'Audit Logs';
    if (path.includes('/settings')) return 'Settings';
    return 'Super Admin';
  };

  const getBreadcrumb = (path: string) => {
    return 'Super Admin / ' + getPageTitle(path);
  };

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] text-slate-900 dark:text-[var(--ivory-cream)] overflow-hidden selection:bg-[var(--deep-saffron)]/30">
      {/* Ambient Background Glows */}
      <div className="fixed top-0 right-0 -mr-40 w-[800px] h-[800px] bg-gradient-to-bl from-[var(--saffron)]/10 via-[var(--gold)]/5 to-transparent rounded-full blur-3xl pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 -ml-40 w-[600px] h-[600px] bg-gradient-to-tr from-[var(--peacock-teal)]/10 to-transparent rounded-full blur-3xl pointer-events-none z-0" />

      {/* Mobile Menu Button */}
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 md:hidden bg-white/80 dark:bg-[#0A0F1E]/80 backdrop-blur-md shadow-lg border-slate-200/60 dark:border-slate-700/40 text-slate-700 dark:text-white"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r shadow-sm transition-all duration-300 ease-out shrink-0",
          "bg-white/70 dark:bg-[#0A0F1E]/95 backdrop-blur-2xl border-slate-200/60 dark:border-slate-700/40",
          isSidebarOpen ? "w-64" : isMobile ? "-translate-x-full" : "w-16"
        )}
      >
        {/* Brand Area */}
        <div className="px-4 py-5 border-b border-slate-200/60 dark:border-slate-700/40 h-[72px] flex items-center">
          <Link href="/dashboard/super-admin" className="flex items-center gap-3 w-full">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-[var(--deep-saffron)] to-[var(--saffron)] shadow-lg shadow-[var(--saffron)]/20 shrink-0 flex items-center justify-center relative">
              <GraduationCap className="h-6 w-6 text-white drop-shadow-md relative z-10" />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0">
                <span className="text-slate-900 dark:text-white font-bold text-base tracking-tight truncate" style={{ fontFamily: 'var(--font-display)' }}>
                  Book Buddy
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--deep-saffron)] mt-0.5 truncate">
                  Super Admin
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-hide relative">
          {navigationSections.map((section) => (
            <div key={section.title} className="mb-6 relative z-10">
              {isSidebarOpen ? (
                <div className="px-4 pt-2 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 dark:text-white/60 truncate block">
                    {section.title}
                  </span>
                </div>
              ) : (
                 <div className="px-4 py-2 flex justify-center">
                   <div className="w-4 h-[1px] bg-slate-200 dark:bg-white/10" />
                 </div>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard/super-admin' && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl mx-2 transition-all duration-200",
                        isActive
                          ? "text-slate-900 dark:text-white font-semibold text-sm bg-gradient-to-r from-[var(--deep-saffron)]/15 to-[var(--saffron)]/10 shadow-sm ring-1 ring-[var(--deep-saffron)]/20 relative after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:w-0.5 after:h-5 after:rounded-full after:bg-gradient-to-b after:from-[var(--deep-saffron)] after:to-[var(--peacock-teal)]"
                          : "text-slate-900 dark:text-white/80 font-medium text-sm hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.07] border border-transparent",
                        !isSidebarOpen && "justify-center px-0"
                      )}
                      title={!isSidebarOpen ? item.name : undefined}
                      onClick={() => isMobile && setIsSidebarOpen(false)}
                    >
                      <item.icon className={cn(
                        "shrink-0",
                        isSidebarOpen ? "h-4 w-4" : "h-5 w-5",
                        isActive ? "text-[var(--deep-saffron)]" : "text-slate-600 dark:text-white/60 group-hover:text-slate-900 dark:group-hover:text-white/90"
                      )} />
                      {isSidebarOpen && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Section Footer */}
        <div className="mt-auto px-3 py-4 border-t border-slate-200/60 dark:border-slate-700/40 relative z-10">
          <div 
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer",
              !isSidebarOpen && "justify-center"
            )}
            onClick={handleLogout}
            title={!isSidebarOpen ? "Logout" : undefined}
          >
            <Avatar className="h-9 w-9 ring-2 ring-[var(--deep-saffron)]/40 shrink-0">
              <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
              <AvatarFallback className="bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white font-bold text-xs">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'SA'}
              </AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name || 'Super Admin'}</p>
                <p className="text-[11px] text-slate-700 dark:text-white/70 truncate">Super Administrator</p>
              </div>
            )}
            {isSidebarOpen && (
              <LogOut className="h-4 w-4 text-slate-600 dark:text-white/60 hover:text-red-500 dark:hover:text-[var(--kumkum)] transition-colors shrink-0" />
            )}
          </div>
        </div>

        {/* Toggle Button (Desktop Only) */}
        {!isMobile && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-[30px] z-50 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--deep-saffron)] to-[var(--saffron)] text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className={cn(
                "h-3 w-3 transition-transform duration-300",
                isSidebarOpen ? "rotate-0" : "rotate-180"
              )}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
        )}
      </aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300 relative z-10 w-full",
        isSidebarOpen && !isMobile ? "ml-64" : isMobile ? "ml-0" : "ml-16"
      )}>
        <main className="relative z-10 flex-1 min-h-0 min-w-0 w-full overflow-y-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 z-30 bg-white/70 dark:bg-[#0A0F1E]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-700/40 px-6 py-4 flex items-center justify-between shadow-sm">
            <div className={cn(isMobile && "ml-10")}>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {getPageTitle(pathname || '')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">{getBreadcrumb(pathname || '')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-white/70 hover:text-slate-700 dark:hover:text-white transition-colors"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-white/70 hover:text-slate-700 dark:hover:text-white transition-colors relative">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--saffron)] rounded-full"></span>
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
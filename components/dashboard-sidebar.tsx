"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Building2,
  ChevronDown,
  FileText,
  GraduationCap,
  Headphones,
  Home,
  Library,
  Menu,
  Settings,
  Users,
  X,
  LogOut,
  BookText,
  Clock,
  Search,
  Send,
  UserCheck,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/useAuthStore"
import { SubscriptionBadge } from "@/components/SubscriptionBadge"

// Define user roles type
type UserRole = 'super-admin' | 'admin' | 'librarian' | 'teacher' | 'student';

interface NavigationSubItem {
  name: string;
  href: string;
  icon: React.ElementType;
  allowedRoles?: UserRole[]; // If undefined, visible to all
}

interface NavigationChildItem extends NavigationSubItem {
  children?: NavigationSubItem[];
}

interface NavigationItem extends NavigationSubItem {
  children?: NavigationChildItem[];
}

interface DashboardSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMobile: boolean
}

export function DashboardSidebar({ isOpen, setIsOpen, isMobile }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const userRole = user?.role as UserRole | undefined

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dashboards: true,
  })

  const toggleMenu = (menu: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }))
  }

  // Define all navigation items with role-based access control
  const allNavigation: NavigationItem[] = [
    {
      name: "Dashboards",
      icon: FileText,
      href: "#",
      children: [
        {
          name: "Super Admin",
          href: "/dashboard/super-admin",
          icon: Users,
          allowedRoles: ['super-admin'], // Only super-admin
          children: [
            { name: "Audit Logs", href: "/dashboard/super-admin/audit", icon: FileText },
            { name: "Branding", href: "/dashboard/super-admin/branding", icon: Settings },
            { name: "Institution", href: "/dashboard/super-admin/institution", icon: Building2 },
            { name: "Subscriptions", href: "/dashboard/super-admin/subscriptions", icon: FileText },
            { name: "Users", href: "/dashboard/super-admin/users", icon: Users },
          ]
        },
        {
          name: "Admin",
          href: "/dashboard/admin",
          icon: Building2,
          allowedRoles: ['super-admin', 'admin'], // Super-admin and admin
          children: [
            { name: "User Management", href: "/dashboard/admin/users", icon: Users },
            { name: "Join Requests", href: "/dashboard/admin/join-requests", icon: UserCheck },
            { name: "Borrowing Policies", href: "/dashboard/admin/borrowing", icon: FileText },
            { name: "Library Oversight", href: "/dashboard/admin/catalog", icon: BookOpen },
            { name: "Analytics", href: "/dashboard/admin/analytics", icon: FileText },
            { name: "Reports", href: "/dashboard/admin/reports", icon: FileText },
            { name: "Overdue Management", href: "/dashboard/admin/overdue", icon: Clock },
          ]
        },
        {
          name: "Librarian",
          href: "/dashboard/librarian",
          icon: Library,
          allowedRoles: ['super-admin', 'admin', 'librarian'], // Super-admin, admin, and librarian
          children: [
            { name: "Book Entry", href: "/dashboard/librarian/cataloging", icon: BookOpen },
            { name: "Bulk Upload", href: "/dashboard/librarian/bulk-upload", icon: FileText },
            { name: "Inventory", href: "/dashboard/librarian/inventory", icon: BookOpen },
            { name: "Join Requests", href: "/dashboard/admin/join-requests", icon: UserCheck },
            { name: "Analytics", href: "/dashboard/librarian/analytics", icon: FileText },
            { name: "Label Generator", href: "/dashboard/librarian/label-generator", icon: FileText },
            { name: "Circulation", href: "/dashboard/librarian/circulation", icon: BookOpen },
          ]
        },
        {
          name: "Teacher",
          href: "/dashboard/teacher",
          icon: GraduationCap,
          allowedRoles: ['super-admin', 'admin', 'teacher'], // Super-admin, admin, and teacher
        },
        {
          name: "Student",
          href: "/dashboard/student",
          icon: BookOpen,
          allowedRoles: ['super-admin', 'admin', 'student'], // Super-admin, admin, and student
        },
      ],
    },
    { name: "Library", href: "/catalog", icon: BookOpen }, // Visible to all
    { name: "E-Book Reader", href: "/reader", icon: BookText }, // Visible to all
    { name: "Audiobook Player", href: "/player", icon: Headphones }, // Unified player for all audiobook formats
  ]

  // Add Browse Institutions for independent students (My Requests is now integrated within Browse Institutions)
  const navigationWithInstitutions = useMemo(() => {
    const nav = [...allNavigation];

    // Add Browse Institutions link for independent students only at position 5 (after Audiobook Player, before Settings)
    // Note: My Requests functionality is now accessible within the Browse Institutions page
    if (user?.accountType === 'INDEPENDENT') {
      nav.push(
        {
          name: "Browse Institutions",
          href: "/institutions/browse",
          icon: Search
        }
      );
    }

    return nav;
  }, [user?.accountType]);

  // Helper function to check if user has access to a navigation item
  const hasAccess = (item: NavigationItem | NavigationChildItem | NavigationSubItem): boolean => {
    if (!item.allowedRoles) return true; // No restrictions, visible to all
    if (!userRole) return false; // No user role, deny access
    return item.allowedRoles.includes(userRole);
  }

  // Filter navigation items based on user role
  const filterNavigation = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .map(item => {
        // Filter children if they exist
        if (item.children) {
          const filteredChildren = item.children
            .filter(child => hasAccess(child))
            .map(child => {
              // Filter sub-children if they exist
              if (child.children) {
                const filteredSubChildren = child.children.filter(subChild => hasAccess(subChild));
                return { ...child, children: filteredSubChildren.length > 0 ? filteredSubChildren : undefined };
              }
              return child;
            });

          // If no children remain after filtering, exclude the parent
          if (filteredChildren.length === 0) return null;

          return { ...item, children: filteredChildren };
        }

        // For items without children, check access directly
        return hasAccess(item) ? item : null;
      })
      .filter((item): item is NavigationItem => item !== null);
  }

  // Get filtered navigation based on user role
  const navigation = useMemo(() => {
    const filtered = filterNavigation(navigationWithInstitutions);

    // Optimize UX: If user has only one dashboard, show it as direct link instead of dropdown
    const dashboardsItem = filtered.find(item => item.name === "Dashboards");
    if (dashboardsItem?.children && dashboardsItem.children.length === 1) {
      // Replace "Dashboards" dropdown with direct link to the single dashboard
      const singleDashboard = dashboardsItem.children[0];
      return filtered.map(item =>
        item.name === "Dashboards"
          ? { ...singleDashboard, name: singleDashboard.name === "Student" ? "Dashboard" : `${singleDashboard.name} Dashboard` }
          : item
      );
    }

    return filtered;
  }, [userRole, navigationWithInstitutions]);

  // Get role-specific settings URL
  const getSettingsUrl = (): string => {
    switch (userRole) {
      case 'super-admin':
        return '/settings/super-admin';
      case 'admin':
        return '/settings/admin';
      case 'librarian':
        return '/settings/librarian';
      case 'teacher':
        return '/settings/teacher';
      case 'student':
        return '/settings/student';
      default:
        return '/settings'; // Fallback
    }
  }

  // Add role-specific settings and logout to navigation
  const navigationWithSettings = useMemo(() => {
    return [
      ...navigation,
      { name: "Settings", href: getSettingsUrl(), icon: Settings },
      { name: "Logout", href: "/logout", icon: LogOut }
    ];
  }, [navigation, userRole]);

  // If sidebar is closed on mobile, show only the toggle button
  if (isMobile && !isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-40 lg:hidden"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Open Menu</span>
      </Button>
    )
  }

  // Mobile sidebar overlay
  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
        <aside className="fixed top-0 left-0 z-50 w-64 h-full bg-gradient-to-b from-gray-900/98 via-slate-900/98 to-gray-950/98 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-blue-500/10 flex flex-col">
          <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-landing-pulse" />
                <div className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 p-3 rounded-2xl shadow-2xl ring-1 ring-white/20 group-hover:scale-110 transition-all duration-500">
                  <Library className="h-7 w-7 text-white drop-shadow-lg" />
                </div>
              </div>
              <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight drop-shadow-sm">
                Book Buddy
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="text-gray-900 dark:text-white hover:bg-white/10 dark:hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="relative group/avatar">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-full blur-lg opacity-40 group-hover/avatar:opacity-70 transition-all duration-500 animate-landing-pulse" />
                <Avatar className="relative h-14 w-14 ring-2 ring-white/30 shadow-xl group-hover/avatar:ring-white/50 transition-all duration-500 group-hover/avatar:scale-110">
                  <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 text-white font-bold text-lg">
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate text-lg tracking-tight drop-shadow-sm">{user?.name || 'User'}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 capitalize font-medium tracking-wide">
                  {userRole?.replace('-', ' ') || 'Guest'}
                </p>
                <div className="mt-2">
                  <SubscriptionBadge size="sm" showDaysRemaining={true} />
                </div>
              </div>
            </div>
          </div>
          <nav className="p-4 space-y-2 overflow-y-auto flex-1 sidebar-scroll" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {navigationWithSettings.map((item) =>
              !item.children ? (
                item.name === "Logout" ? (
                  <Button
                    key={item.name}
                    variant="outline"
                    className="w-full justify-start group !bg-white !border-white text-black hover:!bg-white/95 hover:!border-white hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 rounded-xl font-semibold border-2"
                    asChild
                  >
                    <Link href={item.href}>
                      <div className="p-1.5 rounded-lg !bg-gray-200 group-hover:!bg-gray-300 transition-all duration-500 mr-2 shadow-sm shadow-blue-500/10 border border-gray-300">
                        <item.icon className="h-4 w-4 group-hover:scale-110 transition-all duration-500" />
                      </div>
                      <span className="tracking-wide">{item.name}</span>
                    </Link>
                  </Button>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-500 relative overflow-hidden",
                      pathname === item.href
                        ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-2xl shadow-blue-500/40 ring-1 ring-white/20"
                        : "!bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-xl hover:shadow-blue-500/30 hover:ring-2 hover:ring-blue-400/50 backdrop-blur-sm border-2 border-white/90",
                    )}
                    onClick={() => isMobile && setIsOpen(false)}
                  >
                    <div className={cn(
                      "relative p-2 rounded-xl transition-all duration-500",
                      pathname === item.href
                        ? "bg-white/20 shadow-lg"
                        : "!bg-white group-hover:!bg-white/95 group-hover:shadow-lg shadow-md shadow-blue-500/20 border border-gray-300"
                    )}>
                      <item.icon className={cn(
                        "h-5 w-5 transition-all duration-500",
                        pathname === item.href ? "drop-shadow-lg scale-110" : "drop-shadow-sm group-hover:scale-110 group-hover:drop-shadow-md"
                      )} />
                    </div>
                    <span className="tracking-wide drop-shadow-sm">{item.name}</span>
                    {pathname === item.href && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-landing-shimmer" />
                    )}
                  </Link>
                )
              ) : (
                <div key={item.name}>
                  <button
                    className="group flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold !bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-xl hover:shadow-blue-500/30 hover:ring-2 hover:ring-blue-400/50 transition-all duration-500 relative overflow-hidden backdrop-blur-sm border-2 border-white/90"
                    onClick={() => toggleMenu(item.name.toLowerCase())}
                  >
                    <div className="flex items-center gap-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = item.href;
                      }}>
                      <div className="relative p-2 rounded-xl !bg-white group-hover:!bg-white/95 group-hover:shadow-lg shadow-md shadow-blue-500/20 transition-all duration-500 border border-gray-300">
                        <item.icon className="h-5 w-5 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                      </div>
                      <span className="tracking-wide drop-shadow-sm">{item.name}</span>
                    </div>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-all duration-500", openMenus[item.name.toLowerCase()] && "rotate-180")}
                    />
                  </button>
                  {openMenus[item.name.toLowerCase()] && (
                    <div className="ml-6 mt-2 space-y-1.5 border-l-2 border-white/20 pl-4">
                      {item.children.map((child) => (
                        child.children ? (
                          <div key={child.name}>
                            <button
                              className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium !bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-500 border-2 border-white/90"
                              onClick={() => toggleMenu(child.name.toLowerCase())}
                            >
                              <div className="flex items-center gap-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = child.href;
                                }}>
                                <div className="p-1.5 rounded-lg !bg-white group-hover:!bg-white/95 transition-all duration-500 shadow-md shadow-blue-500/15 border border-gray-300">
                                  <child.icon className="h-4 w-4 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                                </div>
                                <span className="tracking-wide drop-shadow-sm">{child.name}</span>
                              </div>
                              <ChevronDown
                                className={cn("h-4 w-4 transition-all duration-500", openMenus[child.name.toLowerCase()] && "rotate-180")}
                              />
                            </button>
                            {openMenus[child.name.toLowerCase()] && (
                              <div className="ml-4 mt-2 space-y-1.5">
                                {child.children.map((subChild) => (
                                  <Link
                                    key={subChild.name}
                                    href={subChild.href}
                                    className={cn(
                                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-500 relative overflow-hidden",
                                      pathname === subChild.href
                                        ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/20"
                                        : "!bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-lg hover:shadow-blue-500/20 border-2 border-white/90",
                                    )}
                                    onClick={() => isMobile && setIsOpen(false)}
                                  >
                                    <div className={cn(
                                      "p-1.5 rounded-lg transition-all duration-500",
                                      pathname === subChild.href ? "bg-white/20" : "!bg-white group-hover:!bg-white/95 shadow-md shadow-blue-500/15 border border-gray-300"
                                    )}>
                                      <subChild.icon className={cn(
                                        "h-4 w-4 transition-all duration-500 drop-shadow-sm",
                                        pathname === subChild.href ? "scale-110" : "group-hover:scale-110"
                                      )} />
                                    </div>
                                    <span className="tracking-wide drop-shadow-sm">{subChild.name}</span>
                                    {pathname === subChild.href && (
                                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-landing-shimmer" />
                                    )}
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-500 relative overflow-hidden",
                            pathname === child.href
                              ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/20"
                              : "!bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-lg hover:shadow-blue-500/20 border-2 border-white/90",
                          )}
                          onClick={() => isMobile && setIsOpen(false)}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-500",
                            pathname === child.href ? "bg-white/20" : "!bg-white group-hover:!bg-white/95 shadow-md shadow-blue-500/15 border border-gray-300"
                          )}>
                            <child.icon className={cn(
                              "h-4 w-4 transition-all duration-500 drop-shadow-sm",
                              pathname === child.href ? "scale-110" : "group-hover:scale-110"
                            )} />
                          </div>
                          <span className="tracking-wide drop-shadow-sm">{child.name}</span>
                          {pathname === child.href && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-landing-shimmer" />
                          )}
                        </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
          </nav>
        </aside>
      </>
    )
  }

  // Desktop sidebar
  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-40 h-full transition-all duration-300 flex flex-col",
        "bg-gradient-to-b from-gray-900/98 via-slate-900/98 to-gray-950/98 backdrop-blur-xl border-r border-white/10 shadow-2xl shadow-blue-500/10",
        isOpen ? "w-64" : "w-20",
      )}
    >
      {/* Header with gradient logo */}
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-all duration-500 animate-landing-pulse" />
            <div className="relative bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 p-3 rounded-2xl shadow-2xl ring-1 ring-white/20 group-hover:scale-110 transition-all duration-500">
              <Library className="h-7 w-7 text-white drop-shadow-lg" />
            </div>
          </div>
          {isOpen && (
            <span className="text-2xl font-extrabold bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 bg-clip-text text-transparent tracking-tight drop-shadow-sm">
              Book Buddy
            </span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "text-gray-900 dark:text-white hover:bg-white/10 dark:hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110",
            isOpen ? "" : "hidden"
          )}
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Collapse</span>
        </Button>
      </div>

      {/* User Profile Section */}
      {isOpen && (
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="relative group/avatar">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-cyan-600 rounded-full blur-lg opacity-40 group-hover/avatar:opacity-70 transition-all duration-500 animate-landing-pulse" />
              <Avatar className="relative h-14 w-14 ring-2 ring-white/30 shadow-xl group-hover/avatar:ring-white/50 transition-all duration-500 group-hover/avatar:scale-110">
                <AvatarImage src={user?.avatar || "/placeholder-user.jpg"} />
                <AvatarFallback className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 text-white font-bold text-lg">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white truncate text-lg tracking-tight drop-shadow-sm">{user?.name || 'User'}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 capitalize font-medium tracking-wide">
                {userRole?.replace('-', ' ') || 'Guest'}
              </p>
              <div className="mt-2">
                <SubscriptionBadge size="sm" showDaysRemaining={true} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 space-y-2 overflow-y-auto flex-1 sidebar-scroll" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        {navigationWithSettings.map((item) =>
          !item.children ? (
            item.name === "Logout" ? (
              <Button
                key={item.name}
                variant="outline"
                className={cn(
                  "w-full justify-start group !bg-white !border-white text-black hover:!bg-white/95 hover:!border-white hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 rounded-xl font-semibold border-2",
                  !isOpen && "justify-center px-3 w-auto"
                )}
                asChild
                title={!isOpen ? item.name : undefined}
              >
                <Link href={item.href}>
                  <div className={cn(
                    "p-1.5 rounded-lg !bg-gray-200 group-hover:!bg-gray-300 transition-all duration-500 shadow-sm shadow-blue-500/10 border border-gray-300",
                    isOpen ? "mr-2" : "mr-0"
                  )}>
                    <item.icon className={cn(
                      "group-hover:scale-110 transition-all duration-500",
                      isOpen ? "h-4 w-4" : "h-5 w-5"
                    )} />
                  </div>
                  {isOpen && <span className="tracking-wide">{item.name}</span>}
                </Link>
              </Button>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold transition-all duration-500 relative overflow-hidden",
                  pathname === item.href
                    ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-2xl shadow-blue-500/40 ring-1 ring-white/20"
                    : "!bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-xl hover:shadow-blue-500/30 hover:ring-2 hover:ring-blue-400/50 backdrop-blur-sm border-2 border-white/90",
                  !isOpen && "justify-center px-3",
                )}
                title={!isOpen ? item.name : undefined}
              >
                <div className={cn(
                  "relative p-2 rounded-xl transition-all duration-500",
                  pathname === item.href
                    ? "bg-white/20 shadow-lg"
                    : "!bg-gradient-to-br !from-white/90 !to-white/70 group-hover:!from-white/95 group-hover:!to-white/80 group-hover:shadow-lg shadow-md shadow-blue-500/20",
                  !isOpen && "p-0 bg-transparent"
                )}>
                  <item.icon className={cn(
                    "transition-all duration-500",
                    isOpen ? "h-5 w-5" : "h-6 w-6",
                    pathname === item.href ? "drop-shadow-lg scale-110" : "drop-shadow-sm group-hover:scale-110 group-hover:drop-shadow-md"
                  )} />
                </div>
                {isOpen && <span className="tracking-wide drop-shadow-sm">{item.name}</span>}
                {pathname === item.href && isOpen && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-landing-shimmer" />
                )}
              </Link>
            )
          ) : isOpen ? (
            <div key={item.name}>
              <button
                className="group flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-semibold !bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-xl hover:shadow-blue-500/30 hover:ring-2 hover:ring-blue-400/50 transition-all duration-500 relative overflow-hidden backdrop-blur-sm border-2 border-white/90"
                onClick={() => toggleMenu(item.name.toLowerCase())}
              >
                <div className="flex items-center gap-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = item.href;
                  }}>
                  <div className="relative p-2 rounded-xl bg-gradient-to-br from-white/90 to-white/70 group-hover:from-white/95 group-hover:to-white/80 group-hover:shadow-lg shadow-md shadow-blue-500/20 transition-all duration-500">
                    <item.icon className="h-5 w-5 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                  </div>
                  <span className="tracking-wide drop-shadow-sm">{item.name}</span>
                </div>
                <ChevronDown
                  className={cn("h-4 w-4 transition-all duration-500", openMenus[item.name.toLowerCase()] && "rotate-180")}
                />
              </button>
              {openMenus[item.name.toLowerCase()] && (
                <div className="ml-6 mt-2 space-y-1.5 border-l-2 border-white/20 pl-4">
                  {item.children.map((child) => (
                    child.children ? (
                      <div key={child.name}>
                        <button
                          className="group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium !bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-500 border-2 border-white/90"
                          onClick={() => toggleMenu(child.name.toLowerCase())}
                        >
                          <div className="flex items-center gap-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = child.href;
                            }}>
                            <div className="p-1.5 rounded-lg !bg-white group-hover:!bg-white/95 transition-all duration-500 shadow-md shadow-blue-500/15 border border-gray-300">
                              <child.icon className="h-4 w-4 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                            </div>
                            <span className="tracking-wide drop-shadow-sm">{child.name}</span>
                          </div>
                          <ChevronDown
                            className={cn("h-4 w-4 transition-all duration-500", openMenus[child.name.toLowerCase()] && "rotate-180")}
                          />
                        </button>
                        {openMenus[child.name.toLowerCase()] && (
                          <div className="ml-4 mt-2 space-y-1.5">
                            {child.children.map((subChild) => (
                              <Link
                                key={subChild.name}
                                href={subChild.href}
                                className={cn(
                                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-500 relative overflow-hidden",
                                  pathname === subChild.href
                                    ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/20"
                                    : "!bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-lg hover:shadow-blue-500/20 border-2 border-white/90",
                                )}
                              >
                                <div className={cn(
                                  "p-1.5 rounded-lg transition-all duration-500",
                                  pathname === subChild.href ? "bg-white/20" : "!bg-white group-hover:!bg-white/95 shadow-md shadow-blue-500/15 border border-gray-300"
                                )}>
                                  <subChild.icon className={cn(
                                    "h-4 w-4 transition-all duration-500 drop-shadow-sm",
                                    pathname === subChild.href ? "scale-110" : "group-hover:scale-110"
                                  )} />
                                </div>
                                <span className="tracking-wide drop-shadow-sm">{subChild.name}</span>
                                {pathname === subChild.href && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-landing-shimmer" />
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-500 relative overflow-hidden",
                          pathname === child.href
                            ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-xl shadow-blue-500/30 ring-1 ring-white/20"
                            : "!bg-white text-black hover:!bg-white/95 hover:text-black hover:shadow-lg hover:shadow-blue-500/20 border-2 border-white/90",
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg transition-all duration-500",
                        pathname === child.href ? "bg-white/20" : "!bg-white group-hover:!bg-white/95 shadow-md shadow-blue-500/15 border border-gray-300"
                      )}>
                        <child.icon className={cn(
                          "h-4 w-4 transition-all duration-500 drop-shadow-sm",
                          pathname === child.href ? "scale-110" : "group-hover:scale-110"
                        )} />
                      </div>
                      <span className="tracking-wide drop-shadow-sm">{child.name}</span>
                      {pathname === child.href && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-landing-shimmer" />
                      )}
                    </Link>
                    )
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={item.name} className="relative group">
              <button
                className={cn(
                  "flex justify-center rounded-2xl p-3 text-sm font-medium transition-all duration-500 backdrop-blur-sm",
                  item.children.some((child) => pathname === child.href ||
                    (child.children && child.children.some(subChild => pathname === subChild.href)))
                    ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-xl shadow-blue-500/40 ring-1 ring-white/20"
                    : "!bg-gradient-to-br !from-white/80 !to-white/60 text-white hover:!from-white/90 hover:!to-white/70 hover:text-white hover:shadow-lg hover:shadow-blue-500/30 border border-white/60",
                )}
                title={item.name}
              >
                <item.icon className="h-6 w-6 transition-all duration-500 hover:scale-110 drop-shadow-sm" />
              </button>
              <div className="absolute left-full top-0 ml-3 hidden group-hover:block z-50">
                <div className="py-2 bg-gradient-to-br from-gray-900/95 via-gray-900/98 to-gray-950/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-blue-500/20 w-56 ring-1 ring-white/10">
                  {item.children.map((child) => (
                    child.children ? (
                      <div key={child.name} className="relative group/child">
                        <Link
                          href={child.href}
                          className={cn(
                            "group flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-xl mx-2 my-1 transition-all duration-500",
                            pathname === child.href
                              ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                              : "text-white hover:text-white hover:bg-gradient-to-r hover:from-white/80 hover:to-white/60 hover:shadow-md hover:shadow-blue-500/20 border border-transparent hover:border-white/50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-1.5 rounded-lg transition-all duration-500",
                              pathname === child.href ? "bg-white/20" : "bg-gradient-to-br from-white/80 to-white/60 group-hover:from-white/90 group-hover:to-white/70 shadow-md shadow-blue-500/15"
                            )}>
                              <child.icon className="h-4 w-4 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                            </div>
                            <span className="tracking-wide drop-shadow-sm">{child.name}</span>
                          </div>
                          <ChevronDown className="h-4 w-4 transition-all duration-500" onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }} />
                        </Link>
                        <div className="absolute left-full top-0 ml-2 hidden group-hover/child:block z-50">
                          <div className="py-2 bg-gradient-to-br from-gray-900/95 via-gray-900/98 to-gray-950/95 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl shadow-blue-500/20 w-52 ring-1 ring-white/10">
                            {child.children.map((subChild) => (
                              <Link
                                key={subChild.name}
                                href={subChild.href}
                                className={cn(
                                  "group flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl mx-2 my-1 transition-all duration-500",
                                  pathname === subChild.href
                                    ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                                    : "text-white hover:text-white hover:bg-gradient-to-r hover:from-white/80 hover:to-white/60 hover:shadow-md hover:shadow-blue-500/20 border border-transparent hover:border-white/50"
                                )}
                              >
                                <div className={cn(
                                  "p-1.5 rounded-lg transition-all duration-500",
                                  pathname === subChild.href ? "bg-white/20" : "bg-gradient-to-br from-white/80 to-white/60 group-hover:from-white/90 group-hover:to-white/70 shadow-md shadow-blue-500/15"
                                )}>
                                  <subChild.icon className="h-4 w-4 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                                </div>
                                <span className="tracking-wide drop-shadow-sm">{subChild.name}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                          "group flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl mx-2 my-1 transition-all duration-500",
                        pathname === child.href
                          ? "bg-gradient-to-r from-blue-800 via-blue-700 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                          : "text-white hover:text-white hover:bg-gradient-to-r hover:from-white/80 hover:to-white/60 hover:shadow-md hover:shadow-blue-500/20 border border-transparent hover:border-white/50",
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded-lg transition-all duration-500",
                        pathname === child.href ? "bg-white/20" : "bg-gradient-to-br from-white/80 to-white/60 group-hover:from-white/90 group-hover:to-white/70 shadow-md shadow-blue-500/15"
                      )}>
                        <child.icon className="h-4 w-4 group-hover:scale-110 transition-all duration-500 drop-shadow-sm" />
                      </div>
                      <span className="tracking-wide drop-shadow-sm">{child.name}</span>
                    </Link>
                    )
                  ))}
                </div>
              </div>
            </div>
          ),
        )}
      </nav>

      {!isOpen && (
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 flex justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            title="Expand Sidebar"
            className="text-white hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      )}
    </aside>
  )
}

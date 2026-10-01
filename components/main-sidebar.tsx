"use client"

import { useState } from "react"
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
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useSidebar } from "@/components/sidebar-provider"
import { cn } from "@/lib/utils"

export function MainSidebar() {
  const pathname = usePathname()
  const { isMobile, openMobile, setOpenMobile } = useSidebar()
  const [openDashboards, setOpenDashboards] = useState(false)

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Library", href: "/catalog", icon: BookOpen },
    {
      name: "Dashboards",
      icon: FileText,
      children: [
        { 
          name: "Super Admin", 
          href: "/dashboard/super-admin", 
          icon: Users,
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
          children: [
            { name: "User Management", href: "/dashboard/admin/users", icon: Users },
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
          children: [
            { name: "Book Entry", href: "/dashboard/librarian/cataloging", icon: BookOpen },
            { name: "Bulk Upload", href: "/dashboard/librarian/bulk-upload", icon: FileText },
            { name: "Inventory", href: "/dashboard/librarian/inventory", icon: BookOpen },
            { name: "Analytics", href: "/dashboard/librarian/analytics", icon: FileText },
            { name: "Label Generator", href: "/dashboard/librarian/label-generator", icon: FileText },
            { name: "Circulation", href: "/dashboard/librarian/circulation", icon: BookOpen },
          ]
        },
        { name: "Teacher", href: "/dashboard/teacher", icon: GraduationCap },
        { name: "Student", href: "/dashboard/student", icon: BookOpen },
      ],
    },
    { name: "E-book Reader", href: "/reader", icon: BookOpen },
    { name: "Audiobook Player", href: "/player", icon: Headphones },
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-40 md:hidden"
          onClick={() => setOpenMobile(true)}
        >
          <Menu className="h-4 w-4" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
        <SheetContent side="left" className="p-0 w-64">
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Library className="h-6 w-6" />
              <span>Book Buddy</span>
            </Link>
            <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setOpenMobile(false)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="py-4">
            <nav className="space-y-1 px-2">
              {navigation.map((item) =>
                !item.children ? (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                ) : (
                  <div key={item.name}>
                    <button
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                      onClick={() => item.name === "Dashboards" ? setOpenDashboards(!openDashboards) : null}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </div>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", openDashboards && "rotate-180")} />
                    </button>
                    {openDashboards && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children.map((child) => (
                          child.children ? (
                            <div key={child.name}>
                              <Link
                                href={child.href}
                                className={cn(
                                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                                  pathname === child.href
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted",
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMobile(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <child.icon className="h-4 w-4" />
                                  {child.name}
                                </div>
                                <ChevronDown 
                                  className="h-4 w-4" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
                                />
                              </Link>
                              <div className="ml-4 mt-1 space-y-1">
                                {child.children.map((subChild) => (
                                  <Link
                                    key={subChild.name}
                                    href={subChild.href}
                                    className={cn(
                                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                                      pathname === subChild.href
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-muted",
                                    )}
                                    onClick={() => setOpenMobile(false)}
                                  >
                                    <subChild.icon className="h-4 w-4" />
                                    {subChild.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                              pathname === child.href
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-muted",
                            )}
                            onClick={() => setOpenMobile(false)}
                          >
                            <child.icon className="h-4 w-4" />
                            {child.name}
                          </Link>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow border-r bg-background">
        <div className="flex h-16 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Library className="h-6 w-6" />
            <span>Book Buddy</span>
          </Link>
        </div>
        <div className="flex-grow flex flex-col overflow-y-auto">
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) =>
              !item.children ? (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ) : (
                <div key={item.name}>
                  <button
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                    onClick={() => setOpenDashboards(!openDashboards)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", openDashboards && "rotate-180")} />
                  </button>
                  {openDashboards && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child) => (
                        child.children ? (
                          <div key={child.name}>
                            <Link
                              href={child.href}
                              className={cn(
                                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                                pathname === child.href
                                  ? "bg-primary text-primary-foreground"
                                  : "text-muted-foreground hover:bg-muted",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <child.icon className="h-4 w-4" />
                                {child.name}
                              </div>
                              <ChevronDown 
                                className="h-4 w-4" 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              />
                            </Link>
                            <div className="ml-4 mt-1 space-y-1">
                              {child.children.map((subChild) => (
                                <Link
                                  key={subChild.name}
                                  href={subChild.href}
                                  className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                                    pathname === subChild.href
                                      ? "bg-primary text-primary-foreground"
                                      : "text-muted-foreground hover:bg-muted",
                                  )}
                                >
                                  <subChild.icon className="h-4 w-4" />
                                  {subChild.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ) : (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                            pathname === child.href
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted",
                          )}
                        >
                          <child.icon className="h-4 w-4" />
                          {child.name}
                        </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}

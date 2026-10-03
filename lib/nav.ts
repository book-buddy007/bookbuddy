import type { NavItem } from "@/components/ui/sidebar-nav"

export type DashRole = "student" | "teacher" | "librarian" | "admin" | "super-admin"

export const ROLE_LABEL: Record<DashRole, string> = {
  student: "Student",
  teacher: "Teacher",
  librarian: "Librarian",
  admin: "Admin",
  "super-admin": "Super admin",
}

export interface RoleNav {
  /** Full list for the sidebar (desktop/tablet) and the phone "More" sheet. */
  items: NavItem[]
  /** The 4–5 most-used destinations for the phone bottom tab bar. */
  tabs: NavItem[]
  home: string
}

const exact = (n: NavItem): NavItem => ({ ...n, match: "exact" })

const STUDENT: RoleNav = {
  home: "/dashboard/student",
  items: [
    exact({ label: "Home", href: "/dashboard/student", icon: "home" }),
    { label: "Library", href: "/catalog", icon: "library" },
    { label: "My shelf", href: "/dashboard/student/personal-library", icon: "bookmark" },
    { label: "Reader", href: "/reader", icon: "book-open" },
    { label: "Listen", href: "/catalog?format=AUDIOBOOK", icon: "headphones" },
    { label: "Varta", href: "/varta", icon: "varta", ai: true },
    { label: "Sanchika", href: "/reader?tab=sanchika", icon: "flashcards", ai: true },
    { label: "Review", href: "/dashboard/student/review", icon: "highlighter" },
    { label: "Goals", href: "/dashboard/student/goals", icon: "target" },
    { label: "Reading list", href: "/dashboard/student/reading-list", icon: "list" },
    { label: "Recommendations", href: "/dashboard/student/recommendations", icon: "sparkles" },
    { label: "Requests", href: "/dashboard/student/requests", icon: "assignment" },
  ],
  tabs: [
    exact({ label: "Home", href: "/dashboard/student", icon: "home" }),
    { label: "Library", href: "/catalog", icon: "library" },
    { label: "Listen", href: "/catalog?format=AUDIOBOOK", icon: "headphones" },
    { label: "Varta", href: "/varta", icon: "varta", ai: true },
    { label: "Me", href: "/dashboard/student/profile", icon: "user" },
  ],
}

const TEACHER: RoleNav = {
  home: "/dashboard/teacher",
  items: [
    exact({ label: "Dashboard", href: "/dashboard/teacher", icon: "home" }),
    { label: "Overview", href: "/dashboard/teacher/overview", icon: "analytics" },
    { label: "Assignments", href: "/dashboard/teacher/assignments", icon: "assignment" },
    { label: "Resources", href: "/dashboard/teacher/resources", icon: "library" },
    { label: "Library", href: "/catalog", icon: "book-open" },
  ],
  tabs: [
    exact({ label: "Home", href: "/dashboard/teacher", icon: "home" }),
    { label: "Assign", href: "/dashboard/teacher/assignments", icon: "assignment" },
    { label: "Resources", href: "/dashboard/teacher/resources", icon: "library" },
    { label: "Library", href: "/catalog", icon: "book-open" },
  ],
}

const LIBRARIAN: RoleNav = {
  home: "/dashboard/librarian",
  items: [
    exact({ label: "Dashboard", href: "/dashboard/librarian", icon: "home" }),
    { label: "Circulation", href: "/dashboard/librarian/circulation", icon: "scan" },
    { label: "Cataloging", href: "/dashboard/librarian/cataloging", icon: "library" },
    { label: "Bulk upload", href: "/dashboard/librarian/bulk-upload", icon: "upload" },
    { label: "Inventory", href: "/dashboard/librarian/inventory", icon: "list" },
    { label: "Label generator", href: "/dashboard/librarian/label-generator", icon: "bookmark" },
    { label: "Analytics", href: "/dashboard/librarian/analytics", icon: "analytics" },
    { label: "Join requests", href: "/dashboard/admin/join-requests", icon: "users" },
  ],
  tabs: [
    exact({ label: "Home", href: "/dashboard/librarian", icon: "home" }),
    { label: "Circulation", href: "/dashboard/librarian/circulation", icon: "scan" },
    { label: "Catalog", href: "/dashboard/librarian/cataloging", icon: "library" },
    { label: "Inventory", href: "/dashboard/librarian/inventory", icon: "list" },
  ],
}

const ADMIN: RoleNav = {
  home: "/dashboard/admin",
  items: [
    exact({ label: "Dashboard", href: "/dashboard/admin", icon: "home" }),
    { label: "Users", href: "/dashboard/admin/users", icon: "users" },
    { label: "Join requests", href: "/dashboard/admin/join-requests", icon: "user" },
    { label: "Borrowing", href: "/dashboard/admin/borrowing", icon: "calendar" },
    { label: "Library oversight", href: "/dashboard/admin/catalog", icon: "library" },
    { label: "Analytics", href: "/dashboard/admin/analytics", icon: "analytics" },
    { label: "Reports", href: "/dashboard/admin/reports", icon: "file" },
    { label: "Overdue", href: "/dashboard/admin/overdue", icon: "clock" },
  ],
  tabs: [
    exact({ label: "Home", href: "/dashboard/admin", icon: "home" }),
    { label: "Users", href: "/dashboard/admin/users", icon: "users" },
    { label: "Borrowing", href: "/dashboard/admin/borrowing", icon: "calendar" },
    { label: "Overdue", href: "/dashboard/admin/overdue", icon: "clock" },
  ],
}

const SUPER_ADMIN: RoleNav = {
  home: "/dashboard/super-admin",
  items: [
    exact({ label: "Overview", href: "/dashboard/super-admin", icon: "home" }),
    { label: "Institutions", href: "/dashboard/super-admin/institution", icon: "institution" },
    { label: "Users", href: "/dashboard/super-admin/users", icon: "users" },
    { label: "Library", href: "/dashboard/super-admin/catalog", icon: "library" },
    { label: "Subscriptions", href: "/dashboard/super-admin/subscriptions", icon: "card" },
    { label: "Branding", href: "/dashboard/super-admin/branding", icon: "palette" },
    { label: "Storage", href: "/dashboard/super-admin/media", icon: "database" },
    { label: "Audit logs", href: "/dashboard/super-admin/audit", icon: "clock" },
  ],
  tabs: [
    exact({ label: "Home", href: "/dashboard/super-admin", icon: "home" }),
    { label: "Institutions", href: "/dashboard/super-admin/institution", icon: "institution" },
    { label: "Users", href: "/dashboard/super-admin/users", icon: "users" },
    { label: "Library", href: "/dashboard/super-admin/catalog", icon: "library" },
  ],
}

const NAV: Record<DashRole, RoleNav> = {
  student: STUDENT,
  teacher: TEACHER,
  librarian: LIBRARIAN,
  admin: ADMIN,
  "super-admin": SUPER_ADMIN,
}

export function navForRole(role: DashRole, opts?: { independent?: boolean }): RoleNav {
  const base = NAV[role]
  if (role === "student" && opts?.independent) {
    // Independent students can find and join institutions.
    return {
      ...base,
      items: [...base.items, { label: "Institutions", href: "/institutions/browse", icon: "institution" }],
    }
  }
  return base
}

export function isDashRole(value: unknown): value is DashRole {
  return typeof value === "string" && value in NAV
}

/**
 * The session carries the database role as-is (`SUPER_ADMIN`, `ADMIN`, ...), while the
 * dashboards are keyed `super-admin`, `admin`, ... — map one to the other. Null if unknown.
 */
export function normaliseRole(role: unknown): DashRole | null {
  if (typeof role !== "string") return null
  const key = role.trim().toLowerCase().replace(/_/g, "-")
  return isDashRole(key) ? key : null
}

/** Which dashboard a path belongs to, e.g. /dashboard/admin/users -> "admin". */
export function sectionFromPath(pathname: string | null): DashRole | null {
  const m = pathname?.match(/^\/dashboard\/([^/]+)/)
  return m && isDashRole(m[1]) ? m[1] : null
}

/** Dashboards a user of `role` may open (mirrors the role gates in middleware.ts). */
export function accessibleSections(role: string | undefined): DashRole[] {
  switch (normaliseRole(role)) {
    case "super-admin":
      return ["super-admin", "admin", "librarian", "teacher", "student"]
    case "admin":
      return ["admin", "librarian", "teacher", "student"]
    case "librarian":
      return ["librarian"]
    case "teacher":
      return ["teacher"]
    case "student":
      return ["student"]
    default:
      return []
  }
}

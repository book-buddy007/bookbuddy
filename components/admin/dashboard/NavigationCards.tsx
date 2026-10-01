import Link from "next/link";
import { Icon, type BBIconName } from "@/components/ui/icon";

const navCards: { title: string; description: string; icon: BBIconName; href: string }[] = [
  { title: "User management", description: "Manage users and roles", icon: "class", href: "/dashboard/admin/users" },
  { title: "Join requests", description: "Review institution access requests", icon: "user-check", href: "/dashboard/admin/join-requests" },
  { title: "Borrowing policies", description: "Configure limits, fines and periods", icon: "settings", href: "/dashboard/admin/borrowing" },
  { title: "Library oversight", description: "Approve books and manage categories", icon: "library", href: "/dashboard/admin/catalog" },
  { title: "Analytics", description: "View usage statistics", icon: "analytics", href: "/dashboard/admin/analytics" },
  { title: "Reports", description: "Generate custom reports", icon: "pdf", href: "/dashboard/admin/reports" },
  { title: "Overdue management", description: "Manage late returns", icon: "overdue", href: "/dashboard/admin/overdue" },
];

export function NavigationCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {navCards.map((card) => (
        <Link
          href={card.href}
          key={card.href}
          className="bb-lift group flex items-center gap-4 rounded-[18px] bg-bb-surface p-5 shadow-e1 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-bb-accent-soft">
            <Icon name={card.icon} size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{card.title}</h3>
            <p className="text-[13px] text-bb-muted">{card.description}</p>
          </div>
          <Icon name="arrow-right" size={18} />
        </Link>
      ))}
    </div>
  );
}

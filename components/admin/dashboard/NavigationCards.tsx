import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Users, BookOpen, BarChart, FileText, Clock, Settings } from "@/components/ui/icons";
import Link from "next/link";

export function NavigationCards() {
  const navCards = [
    {
      title: "User Management",
      description: "Manage users and roles",
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
      badges: [{ label: "2,543 Users", variant: "default" }, { label: "5 Pending", variant: "outline" }],
      href: "/dashboard/admin/users"
    },
    {
      title: "Borrowing Policies",
      description: "Configure borrowing settings",
      icon: <Settings className="h-5 w-5 text-muted-foreground" />,
      badges: [{ label: "3 Policies", variant: "default" }],
      href: "/dashboard/admin/borrowing"
    },
    {
      title: "Library Oversight",
      description: "Approve books and manage genres",
      icon: <BookOpen className="h-5 w-5 text-muted-foreground" />,
      badges: [{ label: "12,345 Books", variant: "default" }, { label: "3 Pending", variant: "outline" }],
      href: "/dashboard/admin/catalog"
    },
    {
      title: "Analytics",
      description: "View usage statistics",
      icon: <BarChart className="h-5 w-5 text-muted-foreground" />,
      badges: [{ label: "Real-time", variant: "default" }],
      href: "/dashboard/admin/analytics"
    },
    {
      title: "Reports",
      description: "Generate custom reports",
      icon: <FileText className="h-5 w-5 text-muted-foreground" />,
      badges: [{ label: "5 Templates", variant: "default" }],
      href: "/dashboard/admin/reports"
    },
    {
      title: "Overdue Management",
      description: "Manage late returns",
      icon: <Clock className="h-5 w-5 text-muted-foreground" />,
      badges: [{ label: "23 Overdue", variant: "destructive" }],
      href: "/dashboard/admin/overdue"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-6">
      {navCards.map((card, index) => (
        <Link href={card.href} key={index}>
          <Card className="hover:bg-accent/50 cursor-pointer transition-colors h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{card.title}</CardTitle>
                {card.icon}
              </div>
              <CardDescription>{card.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {card.badges.map((badge, badgeIndex) => (
                  <Badge key={badgeIndex} variant={badge.variant as any}>
                    {badge.label}
                  </Badge>
                ))}
              </div>
              <ArrowRight className="h-4 w-4" />
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
} 
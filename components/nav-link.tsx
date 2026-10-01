import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  className?: string;
}

export function NavLink({
  href,
  children,
  exact = false,
  className,
  ...props
}: NavLinkProps) {
  const pathname = usePathname() || "";
  const isActive = exact
    ? pathname === href
    : pathname.startsWith(href);

  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      asChild
      className={cn("justify-start", className)}
      {...props}
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
} 
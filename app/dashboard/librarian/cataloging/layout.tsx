import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Entry | Librarian Dashboard",
  description: "Manage and maintain the library collection",
};

export default function CatalogingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
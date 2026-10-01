import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Label Generator | Librarian Dashboard",
  description: "Generate and print labels for library resources",
};

export default function LabelGeneratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
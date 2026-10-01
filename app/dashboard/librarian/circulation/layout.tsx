import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Circulation | Librarian Dashboard",
  description: "Manage book circulation, check-in and check-out",
};

export default function CirculationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 
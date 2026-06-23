import type { Metadata } from "next";
import "../globals.css";
import DashboardSidebar from "@/components/DashboardSidebar";

export const metadata: Metadata = {
  title: "Dashboard — NSE Options Intelligence",
  description: "NSE F&O options probability intelligence platform — optimal CE/PE selling bands",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import "../globals.css";
import DashboardSidebar from "@/components/DashboardSidebar";

export const metadata: Metadata = {
  title: "Settings — NSE Options Intelligence",
  description: "Configure AI models, data ingestion, analytics, and notifications",
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

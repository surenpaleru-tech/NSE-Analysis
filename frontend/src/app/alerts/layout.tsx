import type { Metadata } from "next";
import "../globals.css";
import DashboardSidebar from "@/components/DashboardSidebar";

export const metadata: Metadata = {
  title: "Alerts — NSE Options Intelligence",
  description: "Notification alerts for option selling recommendations and market events",
};

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

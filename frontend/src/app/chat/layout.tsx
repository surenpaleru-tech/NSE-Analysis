import type { Metadata } from "next";
import "../globals.css";
import DashboardSidebar from "@/components/DashboardSidebar";

export const metadata: Metadata = {
  title: "AI Chat — NSE Options Intelligence",
  description: "Ask AI questions about optimal CE/PE bands and NSE options analytics",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardSidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

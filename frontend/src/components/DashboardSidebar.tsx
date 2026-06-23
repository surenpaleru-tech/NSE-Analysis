"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  MessageSquare,
  TrendingUp,
  Crosshair,
  Shield,
  Bell,
  Settings,
  Zap,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  {
    section: "Dashboards",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/weekly", label: "Weekly Index", icon: Calendar },
      { href: "/dashboard/monthly", label: "Monthly Index", icon: TrendingUp },
      { href: "/dashboard/stocks", label: "Stocks", icon: BarChart3 },
    ],
  },
  {
    section: "Analysis",
    items: [
      { href: "/dashboard/explorer", label: "Band Explorer", icon: Crosshair },
      { href: "/dashboard/scanner", label: "Scanner", icon: Zap },
      { href: "/dashboard/risk", label: "Risk", icon: Shield },
    ],
  },
  {
    section: "Tools",
    items: [
      { href: "/chat", label: "AI Chat", icon: MessageSquare },
      { href: "/alerts", label: "Alerts", icon: Bell },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div
          style={{
            width: 36, height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--gradient-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Zap size={20} color="white" />
        </div>
        <div>
          <h1>NSE Options</h1>
          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            INTELLIGENCE PLATFORM
          </span>
        </div>
      </div>

      {navItems.map((section) => (
        <div className="nav-section" key={section.section}>
          <div className="nav-section-title">{section.section}</div>
          {section.items.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? "active" : ""}`}
                style={{ position: "relative" }}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}

      {/* VIX Indicator at bottom */}
      <div style={{
        marginTop: "auto",
        padding: "1rem",
        background: "var(--bg-tertiary)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-glass)",
      }}>
        <div className="metric-label">India VIX</div>
        <div className="metric-value" style={{ fontSize: "1.5rem" }}>14.82</div>
        <span className="badge badge-success" style={{ marginTop: "0.5rem" }}>Low Volatility</span>
      </div>
    </nav>
  );
}

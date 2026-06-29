"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  CandlestickChart,
  Bell,
  Crosshair,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Radar,
  Settings,
  Shield,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

import { fetchOverview } from "@/lib/api";

const navItems = [
  {
    section: "Dashboards",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/projections", label: "Projection Board", icon: Radar },
      { href: "/dashboard/futures", label: "Futures Outlook", icon: CandlestickChart },
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
      { href: "/dashboard/option-history", label: "Option History", icon: LineChart },
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

interface SidebarOverview {
  latest_vix: number | null;
  current_market_regime: string | null;
  latest_date: string | null;
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const [snapshot, setSnapshot] = useState<SidebarOverview>({
    latest_vix: null,
    current_market_regime: null,
    latest_date: null,
  });

  useEffect(() => {
    async function loadSnapshot() {
      try {
        const overview = await fetchOverview();
        setSnapshot({
          latest_vix: overview.latest_vix,
          current_market_regime: overview.current_market_regime,
          latest_date: overview.latest_date,
        });
      } catch (error) {
        console.error("Failed to load sidebar snapshot:", error);
      }
    }

    loadSnapshot();
  }, []);

  const vixLabel =
    snapshot.latest_vix === null
      ? "Waiting for feed"
      : snapshot.latest_vix < 15
        ? "Low volatility"
        : snapshot.latest_vix > 25
          ? "High volatility"
          : "Balanced volatility";

  const vixVariant =
    snapshot.latest_vix === null
      ? "info"
      : snapshot.latest_vix < 15
        ? "success"
        : snapshot.latest_vix > 25
          ? "danger"
          : "warning";

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <div className="brand-mark">
          <Waves size={20} color="white" />
        </div>
        <div>
          <h1>NSE Options</h1>
          <span className="sidebar-kicker">ANALYSIS WORKSPACE</span>
        </div>
      </div>

      {navItems.map((section) => (
        <div className="nav-section" key={section.section}>
          <div className="nav-section-title">{section.section}</div>
          {section.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
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

      <div className="sidebar-snapshot">
        <div className="metric-label">Live Snapshot</div>
        <div className="snapshot-row">
          <span>India VIX</span>
          <strong>{snapshot.latest_vix?.toFixed(2) ?? "--"}</strong>
        </div>
        <div className="snapshot-row">
          <span>Regime</span>
          <strong>{snapshot.current_market_regime ?? "--"}</strong>
        </div>
        <div className="snapshot-row">
          <span>As of</span>
          <strong>{snapshot.latest_date ?? "--"}</strong>
        </div>
        <span className={`badge badge-${vixVariant}`} style={{ marginTop: "0.75rem" }}>
          {vixLabel}
        </span>
      </div>
    </nav>
  );
}

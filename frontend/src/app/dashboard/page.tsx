"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CandlestickChart,
  Radar,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
  Zap,
} from "lucide-react";

import { fetchOpportunities, fetchOverview } from "../../lib/api";

interface OverviewData {
  latest_vix: number | null;
  symbols_tracked: number;
  latest_recommendations: number;
  latest_date: string | null;
  avg_probability: number | null;
  current_market_regime: string | null;
  top_symbol: string | null;
}

interface QuickRec {
  symbol: string;
  spot_price: number | null;
  recommended_ce_pct: number | null;
  recommended_pe_pct: number | null;
  combined_probability: number | null;
  expected_return: number | null;
}

const workspaceLinks = [
  {
    href: "/dashboard/projections",
    title: "Projection Board",
    subtitle: "Best CE and PE percentages across the live universe",
    icon: Radar,
  },
  {
    href: "/dashboard/futures",
    title: "Futures Outlook",
    subtitle: "Directional futures bias built from historical spot behavior",
    icon: CandlestickChart,
  },
  {
    href: "/dashboard/scanner",
    title: "Scanner",
    subtitle: "Fast ranked opportunities for the current session",
    icon: Zap,
  },
];

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<OverviewData>({
    latest_vix: null,
    symbols_tracked: 0,
    latest_recommendations: 0,
    latest_date: null,
    avg_probability: null,
    current_market_regime: null,
    top_symbol: null,
  });
  const [topPicks, setTopPicks] = useState<QuickRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [overviewRes, oppsRes] = await Promise.all([
          fetchOverview(),
          fetchOpportunities("expected_return", 6),
        ]);

        if (overviewRes) {
          setMetrics({
            latest_vix: overviewRes.latest_vix,
            symbols_tracked: overviewRes.symbols_tracked,
            latest_recommendations: overviewRes.latest_recommendations,
            latest_date: overviewRes.latest_date,
            avg_probability: overviewRes.avg_probability,
            current_market_regime: overviewRes.current_market_regime,
            top_symbol: overviewRes.top_symbol,
          });
        }

        if (oppsRes?.opportunities) {
          setTopPicks(
            oppsRes.opportunities.map((row) => ({
              symbol: row.symbol,
              spot_price: row.spot_price,
              recommended_ce_pct: row.recommended_ce_pct,
              recommended_pe_pct: row.recommended_pe_pct,
              combined_probability: row.combined_probability,
              expected_return: row.expected_return,
            })),
          );
        }
      } catch (error) {
        console.error("Failed to load overview dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const formatPercent = (value: number | null, digits = 1) =>
    value !== null ? `${(value * 100).toFixed(digits)}%` : "--";

  const formatPrice = (value: number | null) =>
    value !== null ? `Rs ${value.toLocaleString("en-IN")}` : "--";

  const regimeLabel = metrics.current_market_regime ?? "Awaiting regime";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Trading Workspace Overview</h1>
        <p className="page-subtitle">
          Current signals, top ranges, and direct links into the new projection tools
        </p>
      </div>

      <div className="page-body">
        <section className="hero-panel animate-fade-in">
          <div className="hero-copy">
            <span className="hero-eyebrow">Today&apos;s pulse</span>
            <h2>
              Best symbol right now: <span>{metrics.top_symbol ?? "Waiting for fresh data"}</span>
            </h2>
            <p>
              Watch the live recommendation set, then jump into projection board or futures outlook
              for deeper planning across the coming weeks and months.
            </p>
          </div>
          <div className="hero-stat-strip">
            <div>
              <span>Recommendation date</span>
              <strong>{metrics.latest_date ?? "--"}</strong>
            </div>
            <div>
              <span>Average probability</span>
              <strong>{formatPercent(metrics.avg_probability)}</strong>
            </div>
            <div>
              <span>Current regime</span>
              <strong>{regimeLabel}</strong>
            </div>
          </div>
        </section>

        <div className="grid-metrics animate-fade-in" style={{ marginTop: "1.5rem" }}>
          <MetricCard
            label="India VIX"
            value={metrics.latest_vix?.toFixed(2) ?? "--"}
            icon={<Activity size={20} />}
            badge={
              metrics.latest_vix
                ? metrics.latest_vix < 15
                  ? { text: "Low volatility", variant: "success" as const }
                  : metrics.latest_vix > 25
                    ? { text: "High volatility", variant: "danger" as const }
                    : { text: "Balanced", variant: "warning" as const }
                : undefined
            }
          />
          <MetricCard
            label="Symbols Tracked"
            value={metrics.symbols_tracked.toString()}
            icon={<BarChart3 size={20} />}
            badge={{ text: "Live universe", variant: "info" as const }}
          />
          <MetricCard
            label="Recommendations"
            value={metrics.latest_recommendations.toString()}
            icon={<Target size={20} />}
            badge={{ text: "Latest session", variant: "success" as const }}
          />
          <MetricCard
            label="Market Regime"
            value={regimeLabel}
            icon={<Waves size={20} />}
            badge={{ text: "Adaptive", variant: "info" as const }}
          />
        </div>

        <section className="workspace-grid" style={{ marginTop: "1.5rem" }}>
          {workspaceLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="workspace-link-card">
                <div className="workspace-link-top">
                  <span className="workspace-link-icon">
                    <Icon size={18} />
                  </span>
                  <ArrowRight size={16} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.subtitle}</p>
              </Link>
            );
          })}
        </section>

        <section className="glass-card" style={{ marginTop: "1.5rem", padding: "1.5rem" }}>
          <div className="section-heading">
            <div>
              <h2>
                <Zap size={18} style={{ color: "var(--accent-amber)" }} />
                Live Top Recommendations
              </h2>
              <p>Highest expected-return opportunities from the latest database snapshot</p>
            </div>
            <Link href="/dashboard/scanner" className="btn btn-ghost">
              Open scanner
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    "Symbol",
                    "Spot",
                    "CE band",
                    "PE band",
                    "Projected range",
                    "Probability",
                    "Expected value",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 7 }).map((__, cellIndex) => (
                        <td key={cellIndex}>
                          <div className="skeleton" style={{ height: 16, width: "70%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : topPicks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state-cell">
                      No recommendations found in the current database snapshot.
                    </td>
                  </tr>
                ) : (
                  topPicks.map((rec) => {
                    const ceStrike =
                      rec.spot_price !== null && rec.recommended_ce_pct !== null
                        ? rec.spot_price * (1 + rec.recommended_ce_pct / 100)
                        : null;
                    const peStrike =
                      rec.spot_price !== null && rec.recommended_pe_pct !== null
                        ? rec.spot_price * (1 - rec.recommended_pe_pct / 100)
                        : null;

                    return (
                      <tr key={rec.symbol}>
                        <td>
                          <div className="table-symbol">
                            <strong>{rec.symbol}</strong>
                            <span>{metrics.latest_date ?? "--"}</span>
                          </div>
                        </td>
                        <td className="mono">{formatPrice(rec.spot_price)}</td>
                        <td>
                          <span className="badge badge-danger">
                            <TrendingUp size={12} />
                            +{rec.recommended_ce_pct ?? "--"}%
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-success">
                            <TrendingDown size={12} />
                            -{rec.recommended_pe_pct ?? "--"}%
                          </span>
                        </td>
                        <td>
                          <div className="table-symbol">
                            <strong>
                              {formatPrice(peStrike)} to {formatPrice(ceStrike)}
                            </strong>
                            <span>From current spot</span>
                          </div>
                        </td>
                        <td className="mono">{formatPercent(rec.combined_probability)}</td>
                        <td className="mono">
                          {rec.expected_return !== null
                            ? `Rs ${rec.expected_return.toLocaleString("en-IN", {
                                maximumFractionDigits: 2,
                              })}`
                            : "--"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
  badge,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  badge?: { text: string; variant: "success" | "danger" | "warning" | "info" };
}) {
  return (
    <div className="metric-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
          {badge ? (
            <span className={`badge badge-${badge.variant}`} style={{ marginTop: 8 }}>
              {badge.text}
            </span>
          ) : null}
        </div>
        <div className="metric-icon-shell">{icon}</div>
      </div>
    </div>
  );
}

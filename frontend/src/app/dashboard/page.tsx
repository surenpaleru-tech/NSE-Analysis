"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
  Zap,
} from "lucide-react";

interface OverviewData {
  latest_vix: number | null;
  symbols_tracked: number;
  latest_recommendations: number;
  latest_date: string | null;
}

interface QuickRec {
  symbol: string;
  spot_price: number | null;
  recommended_ce_pct: number | null;
  recommended_pe_pct: number | null;
  combined_probability: number | null;
  expected_return: number | null;
}

// Sample data for initial display
const sampleMetrics = {
  latest_vix: 14.82,
  symbols_tracked: 198,
  latest_recommendations: 214,
  latest_date: new Date().toISOString().split("T")[0],
};

const sampleTopPicks: QuickRec[] = [
  { symbol: "NIFTY", spot_price: 24856.50, recommended_ce_pct: 5.0, recommended_pe_pct: 4.0, combined_probability: 0.88, expected_return: 0.032 },
  { symbol: "BANKNIFTY", spot_price: 54230.00, recommended_ce_pct: 6.0, recommended_pe_pct: 5.0, combined_probability: 0.85, expected_return: 0.028 },
  { symbol: "FINNIFTY", spot_price: 25320.75, recommended_ce_pct: 5.5, recommended_pe_pct: 4.5, combined_probability: 0.87, expected_return: 0.031 },
  { symbol: "RELIANCE", spot_price: 2945.80, recommended_ce_pct: 7.0, recommended_pe_pct: 6.0, combined_probability: 0.82, expected_return: 0.025 },
  { symbol: "HDFCBANK", spot_price: 1789.45, recommended_ce_pct: 6.5, recommended_pe_pct: 5.5, combined_probability: 0.84, expected_return: 0.027 },
  { symbol: "TCS", spot_price: 3892.20, recommended_ce_pct: 8.0, recommended_pe_pct: 7.0, combined_probability: 0.86, expected_return: 0.029 },
];

export default function DashboardOverview() {
  const [metrics] = useState(sampleMetrics);
  const [topPicks] = useState<QuickRec[]>(sampleTopPicks);

  const formatPercent = (val: number | null) =>
    val !== null ? `${(val * 100).toFixed(1)}%` : "--";
  const formatPrice = (val: number | null) =>
    val !== null ? `₹${val.toLocaleString("en-IN")}` : "--";

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Dashboard Overview</h1>
        <p className="page-subtitle">
          Real-time recommendations and market intelligence
        </p>
      </div>

      <div className="page-body">
        {/* Metric Cards */}
        <div className="grid-metrics animate-fade-in">
          <MetricCard
            label="India VIX"
            value={metrics.latest_vix?.toFixed(2) ?? "--"}
            icon={<Activity size={20} />}
            badge={
              metrics.latest_vix
                ? metrics.latest_vix < 15
                  ? { text: "Low", variant: "success" as const }
                  : metrics.latest_vix > 25
                  ? { text: "High", variant: "danger" as const }
                  : { text: "Medium", variant: "warning" as const }
                : undefined
            }
          />
          <MetricCard
            label="Symbols Tracked"
            value={metrics.symbols_tracked.toString()}
            icon={<BarChart3 size={20} />}
            badge={{ text: "Active", variant: "success" as const }}
          />
          <MetricCard
            label="Recommendations"
            value={metrics.latest_recommendations.toString()}
            icon={<Target size={20} />}
            badge={{ text: "Today", variant: "info" as const }}
          />
          <MetricCard
            label="Market Regime"
            value="Sideways"
            icon={<TrendingUp size={20} />}
            badge={{ text: "Stable", variant: "info" as const }}
          />
        </div>

        {/* Top Picks Table */}
        <div
          className="glass-card animate-fade-in"
          style={{ marginTop: "1.5rem", padding: "1.5rem" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                <Zap
                  size={18}
                  style={{
                    display: "inline",
                    marginRight: 8,
                    color: "var(--accent-amber)",
                  }}
                />
                Top Recommendations
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Best CE/PE selling opportunities ranked by expected return
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--border-primary)",
                  }}
                >
                  {[
                    "Symbol",
                    "Spot Price",
                    "CE %",
                    "PE %",
                    "CE Strike",
                    "PE Strike",
                    "Probability",
                    "Exp. Return",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        color: "var(--text-muted)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPicks.map((rec, idx) => {
                  const ceStrike =
                    rec.spot_price && rec.recommended_ce_pct
                      ? rec.spot_price * (1 + rec.recommended_ce_pct / 100)
                      : null;
                  const peStrike =
                    rec.spot_price && rec.recommended_pe_pct
                      ? rec.spot_price * (1 - rec.recommended_pe_pct / 100)
                      : null;

                  return (
                    <tr
                      key={rec.symbol}
                      style={{
                        borderBottom: "1px solid var(--border-glass)",
                        transition: "background var(--transition-fast)",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--bg-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          fontWeight: 600,
                          color: "var(--text-primary)",
                        }}
                      >
                        {rec.symbol}
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {formatPrice(rec.spot_price)}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <span className="badge badge-danger">
                          <TrendingUp size={12} style={{ marginRight: 4 }} />
                          +{rec.recommended_ce_pct}%
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <span className="badge badge-success">
                          <TrendingDown size={12} style={{ marginRight: 4 }} />
                          -{rec.recommended_pe_pct}%
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-secondary)",
                          fontSize: "0.8rem",
                        }}
                      >
                        {ceStrike ? `₹${Math.round(ceStrike).toLocaleString("en-IN")}` : "--"}
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-secondary)",
                          fontSize: "0.8rem",
                        }}
                      >
                        {peStrike ? `₹${Math.round(peStrike).toLocaleString("en-IN")}` : "--"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 60,
                              height: 6,
                              background: "var(--bg-tertiary)",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(rec.combined_probability ?? 0) * 100}%`,
                                height: "100%",
                                background:
                                  (rec.combined_probability ?? 0) > 0.85
                                    ? "var(--accent-emerald)"
                                    : "var(--accent-amber)",
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              color:
                                (rec.combined_probability ?? 0) > 0.85
                                  ? "var(--accent-emerald)"
                                  : "var(--accent-amber)",
                            }}
                          >
                            {formatPercent(rec.combined_probability)}
                          </span>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "0.875rem 1rem",
                          fontWeight: 700,
                          color: "var(--accent-emerald)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {formatPercent(rec.expected_return)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// MetricCard Component
// =============================================================================

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div className="metric-label">{label}</div>
          <div className="metric-value">{value}</div>
          {badge && (
            <span className={`badge badge-${badge.variant}`} style={{ marginTop: 8 }}>
              {badge.text}
            </span>
          )}
        </div>
        <div
          style={{
            padding: 10,
            borderRadius: "var(--radius-md)",
            background: "var(--bg-tertiary)",
            color: "var(--accent-blue)",
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

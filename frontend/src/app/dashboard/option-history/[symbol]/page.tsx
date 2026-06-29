"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Info, BarChart2, Layers } from "lucide-react";
import { fetchOptionHistory } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function OptionHistoryDetailPage({
  params,
}: {
  params: Promise<any>;
}) {
  const resolvedParams = use(params) as any;
  const symbol = resolvedParams?.symbol || "";
  const [expiryType, setExpiryType] = useState<"weekly" | "monthly">("monthly");
  const [historyData, setHistoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTabIdx, setActiveTabIdx] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchOptionHistory(symbol, expiryType);
        setHistoryData(res);
        setActiveTabIdx(0); // Reset active tab
      } catch (err) {
        console.error("Failed to load option history detail:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [symbol, expiryType]);

  const expiries = historyData?.expiries || [];
  const activeExpiry = expiries[activeTabIdx];

  // Helper to format currency
  const formatCurrency = (val: number | null) => {
    return val !== null && val !== undefined ? `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "--";
  };

  // Helper to format short date
  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  };

  // Compute table rows for the active expiry
  const getTableRows = () => {
    if (!activeExpiry) return [];
    const entryCE = activeExpiry.daily_data[0]?.ce_close || 0;
    const entryPE = activeExpiry.daily_data[0]?.pe_close || 0;
    const entryTotal = entryCE + entryPE;

    return activeExpiry.daily_data.map((row: any, idx: number) => {
      const totalPremium = row.ce_close + row.pe_close;
      // Option Seller P&L = Entry Premium - Current Premium
      const pnl = entryTotal - totalPremium;
      const pnlPct = entryTotal > 0 ? (pnl / entryTotal) * 100 : 0;

      return {
        ...row,
        total_premium: totalPremium,
        pnl,
        pnl_pct: pnlPct,
        is_entry: idx === 0,
      };
    });
  };

  const tableRows = getTableRows();

  return (
    <>
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Link href="/dashboard/option-history" className="glass-card" style={{ padding: "0.5rem", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="page-title">{symbol} Option History</h1>
          <p className="page-subtitle">Historical day-by-day strangle values (CE & PE) and underlying spot price</p>
        </div>
      </div>

      <div className="page-body">
        {/* Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
          {/* Expiry Type Switch */}
          <div className="glass-card" style={{ display: "inline-flex", padding: 4, borderRadius: "var(--radius-md)" }}>
            <button
              onClick={() => setExpiryType("monthly")}
              className={`nav-link ${expiryType === "monthly" ? "active" : ""}`}
              style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: expiryType === "monthly" ? "var(--bg-active)" : "transparent", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 600 }}
            >
              Monthly Expiries
            </button>
            <button
              onClick={() => setExpiryType("weekly")}
              className={`nav-link ${expiryType === "weekly" ? "active" : ""}`}
              style={{ padding: "0.4rem 1rem", borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer", background: expiryType === "weekly" ? "var(--bg-active)" : "transparent", color: "var(--text-primary)", fontSize: "0.85rem", fontWeight: 600 }}
            >
              Weekly Expiries
            </button>
          </div>
        </div>

        {loading ? (
          <div className="glass-card" style={{ padding: "3rem", display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="skeleton" style={{ height: 40, width: "100%" }} />
            <div className="skeleton" style={{ height: 300, width: "100%" }} />
            <div className="skeleton" style={{ height: 200, width: "100%" }} />
          </div>
        ) : expiries.length === 0 ? (
          <div className="glass-card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Info size={32} style={{ color: "var(--text-muted)" }} />
            <div>No option history data found for {symbol} ({expiryType} contracts).</div>
            <p style={{ fontSize: "0.85rem", maxWidth: 500 }}>
              Verify if the ingestion pipeline has scraped options and spot history for this symbol, or check another expiry type.
            </p>
          </div>
        ) : (
          <>
            {/* Expiry Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-primary)", gap: "0.5rem", marginBottom: "1.5rem", overflowX: "auto" }}>
              {expiries.map((exp: any, idx: number) => (
                <button
                  key={exp.expiry_date}
                  onClick={() => setActiveTabIdx(idx)}
                  style={{
                    padding: "0.75rem 1.25rem",
                    border: "none",
                    borderBottom: activeTabIdx === idx ? "2px solid var(--accent-purple)" : "2px solid transparent",
                    background: "transparent",
                    color: activeTabIdx === idx ? "var(--text-primary)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    transition: "color 0.2s, border-bottom-color 0.2s",
                  }}
                >
                  {exp.expiry_label}
                </button>
              ))}
            </div>

            {/* Selected Month Summary */}
            {activeExpiry && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="glass-card" style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Spot at Entry</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {formatCurrency(activeExpiry.spot_at_entry)}
                  </div>
                </div>
                <div className="glass-card" style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>CE Strike (Sold)</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-red)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {activeExpiry.ce_strike}
                    <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 }}>
                      (+{activeExpiry.ce_pct}%)
                    </span>
                  </div>
                </div>
                <div className="glass-card" style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>PE Strike (Sold)</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-emerald)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {activeExpiry.pe_strike}
                    <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 }}>
                      (-{activeExpiry.pe_pct}%)
                    </span>
                  </div>
                </div>
                <div className="glass-card" style={{ padding: "1.25rem 1.5rem" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500, textTransform: "uppercase" }}>Combined Premium</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--accent-blue)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                    {activeExpiry.daily_data[0] ? formatCurrency(activeExpiry.daily_data[0].ce_close + activeExpiry.daily_data[0].pe_close) : "--"}
                  </div>
                </div>
              </div>
            )}

            {/* Line Chart */}
            {activeExpiry && (
              <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", height: 400 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={16} /> Option Decay & Spot Trend
                </h3>
                <ResponsiveContainer width="100%" height="88%">
                  <LineChart data={activeExpiry.daily_data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-glass)" />
                    <XAxis
                      dataKey="trade_date"
                      tickFormatter={formatShortDate}
                      stroke="var(--text-muted)"
                      style={{ fontSize: "0.75rem" }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--text-muted)"
                      style={{ fontSize: "0.75rem" }}
                      label={{ value: "Premium (₹)", angle: -90, position: "insideLeft", fill: "var(--text-muted)", style: { fontSize: "0.75rem" } }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={["auto", "auto"]}
                      stroke="var(--text-muted)"
                      style={{ fontSize: "0.75rem" }}
                      label={{ value: "Spot Price (₹)", angle: 90, position: "insideRight", fill: "var(--text-muted)", style: { fontSize: "0.75rem" } }}
                    />
                    <Tooltip
                      contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border-primary)", borderRadius: 8, color: "var(--text-primary)", fontSize: "0.8rem" }}
                      labelFormatter={(label) => `Trade Date: ${label}`}
                    />
                    <Legend wrapperStyle={{ fontSize: "0.8rem", color: "var(--text-primary)" }} />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ce_close"
                      name="CE Premium"
                      stroke="var(--accent-red)"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      dot={activeExpiry.daily_data.length < 30}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pe_close"
                      name="PE Premium"
                      stroke="var(--accent-emerald)"
                      activeDot={{ r: 8 }}
                      strokeWidth={2}
                      dot={activeExpiry.daily_data.length < 30}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="spot_price"
                      name="Spot Price (RHS)"
                      stroke="var(--accent-purple)"
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Data Table */}
            {activeExpiry && (
              <div className="glass-card" style={{ padding: "1.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={16} /> Daily Historical Breakdown
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                        {["Date", "Spot Price", "CE Close", "PE Close", "Combined Value", "Daily P&L", "Return %"].map((h) => (
                          <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row: any, idx: number) => (
                        <tr key={row.trade_date} style={{ borderBottom: "1px solid var(--border-glass)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                          <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.trade_date}</td>
                          <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                            {formatCurrency(row.spot_price)}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--accent-red)" }}>
                            {formatCurrency(row.ce_close)}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--accent-emerald)" }}>
                            {formatCurrency(row.pe_close)}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                            {formatCurrency(row.total_premium)}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)" }}>
                            {row.is_entry ? (
                              <span style={{ color: "var(--text-muted)" }}>Position Entry</span>
                            ) : (
                              <span style={{ color: row.pnl >= 0 ? "var(--accent-emerald)" : "var(--accent-red)", fontWeight: 700 }}>
                                {row.pnl >= 0 ? "+" : ""}{formatCurrency(row.pnl)}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)" }}>
                            {row.is_entry ? (
                              <span style={{ color: "var(--text-muted)" }}>--</span>
                            ) : (
                              <span style={{ color: row.pnl_pct >= 0 ? "var(--accent-emerald)" : "var(--accent-red)", fontWeight: 700 }}>
                                {row.pnl_pct >= 0 ? "+" : ""}{row.pnl_pct.toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

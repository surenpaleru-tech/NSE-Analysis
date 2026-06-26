"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fetchMonthlyIndex } from "../../../lib/api";

export default function MonthlyIndexPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await fetchMonthlyIndex();
        if (result && result.length > 0) {
          // Map Recommendation format to the page row format if needed
          const mapped = result.map(r => ({
            symbol: r.symbol,
            spot: r.spot_price ?? 0,
            ce_pct: r.recommended_ce_pct ?? 0,
            pe_pct: r.recommended_pe_pct ?? 0,
            ce_strike: r.recommended_ce_strike ?? 0,
            pe_strike: r.recommended_pe_strike ?? 0,
            probability: r.combined_probability ?? 0,
            expected_return: r.expected_return ?? 0,
            sharpe: r.risk_score ?? 0, // Fallback to risk score if needed, or default to 0
          }));
          setData(mapped);
        }
      } catch (err) {
        console.error("Failed to load monthly index recommendations:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <TrendingUp size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-emerald)" }} />
          Indices — Monthly Recommendations
        </h1>
        <p className="page-subtitle">Optimal CE/PE selling bands for monthly index expiries</p>
      </div>
      <div className="page-body">
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  {["Symbol", "Spot", "Best CE%", "Best PE%", "CE Strike", "PE Strike", "Probability", "Exp Return", "Sharpe"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 80 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 50 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 50 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 70 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 70 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                      No monthly recommendations found in database.
                    </td>
                  </tr>
                ) : (
                  data.map(row => (
                    <tr key={row.symbol} style={{ borderBottom: "1px solid var(--border-glass)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.symbol}</td>
                      <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>₹{row.spot.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "0.875rem 1rem" }}><span className="badge badge-danger"><TrendingUp size={12} style={{ marginRight: 3 }} />+{row.ce_pct}%</span></td>
                      <td style={{ padding: "0.875rem 1rem" }}><span className="badge badge-success"><TrendingDown size={12} style={{ marginRight: 3 }} />-{row.pe_pct}%</span></td>
                      <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>₹{row.ce_strike.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>₹{row.pe_strike.toLocaleString("en-IN")}</td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: row.probability > 0.85 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{(row.probability * 100).toFixed(0)}%</td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 700, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>{(row.expected_return * 100).toFixed(1)}%</td>
                      <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: row.sharpe > 1.5 ? "var(--accent-blue)" : "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{row.sharpe.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState } from "react";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

const sampleWeeklyData = [
  { symbol: "NIFTY", spot: 24856.50, ce_pct: 3.5, pe_pct: 3.0, ce_strike: 25726, pe_strike: 24111, probability: 0.91, expected_return: 0.024, regime: "sideways" },
  { symbol: "BANKNIFTY", spot: 54230.00, ce_pct: 4.0, pe_pct: 3.5, ce_strike: 56399, pe_strike: 52332, probability: 0.88, expected_return: 0.021, regime: "sideways" },
  { symbol: "FINNIFTY", spot: 25320.75, ce_pct: 3.5, pe_pct: 3.0, ce_strike: 26207, pe_strike: 24561, probability: 0.90, expected_return: 0.023, regime: "sideways" },
  { symbol: "MIDCPNIFTY", spot: 12450.25, ce_pct: 4.0, pe_pct: 3.5, ce_strike: 12948, pe_strike: 12014, probability: 0.87, expected_return: 0.019, regime: "bull" },
  { symbol: "NIFTYNXT50", spot: 68245.00, ce_pct: 4.5, pe_pct: 4.0, ce_strike: 71316, pe_strike: 65515, probability: 0.86, expected_return: 0.018, regime: "sideways" },
];

export default function WeeklyIndexPage() {
  const [data] = useState(sampleWeeklyData);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <Calendar size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-blue)" }} />
          Indices — Weekly Recommendations
        </h1>
        <p className="page-subtitle">
          Optimal CE/PE selling bands for weekly index expiries
        </p>
      </div>
      <div className="page-body">
        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  {["Symbol", "Spot", "Best CE%", "Best PE%", "CE Strike", "PE Strike", "Probability", "Exp Return", "Regime"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.symbol} style={{ borderBottom: "1px solid var(--border-glass)", transition: "background 150ms" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.symbol}</td>
                    <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>₹{row.spot.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span className="badge badge-danger"><TrendingUp size={12} style={{ marginRight: 3 }} />+{row.ce_pct}%</span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span className="badge badge-success"><TrendingDown size={12} style={{ marginRight: 3 }} />-{row.pe_pct}%</span>
                    </td>
                    <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>₹{row.ce_strike.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>₹{row.pe_strike.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: row.probability > 0.88 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{(row.probability * 100).toFixed(0)}%</td>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 700, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>{(row.expected_return * 100).toFixed(1)}%</td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <span className={`badge badge-${row.regime === "bull" ? "success" : row.regime === "bear" ? "danger" : "info"}`}>{row.regime}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

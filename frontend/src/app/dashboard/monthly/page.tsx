"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { fetchMonthlyIndex } from "../../../lib/api";

const sampleMonthlyData = [
  { symbol: "NIFTY", spot: 24856.50, ce_pct: 6.0, pe_pct: 5.0, ce_strike: 26348, pe_strike: 23614, probability: 0.88, expected_return: 0.032, sharpe: 1.85 },
  { symbol: "BANKNIFTY", spot: 54230.00, ce_pct: 7.0, pe_pct: 6.0, ce_strike: 58026, pe_strike: 50976, probability: 0.85, expected_return: 0.028, sharpe: 1.62 },
  { symbol: "FINNIFTY", spot: 25320.75, ce_pct: 6.5, pe_pct: 5.5, ce_strike: 26967, pe_strike: 23928, probability: 0.87, expected_return: 0.031, sharpe: 1.78 },
  { symbol: "MIDCPNIFTY", spot: 12450.25, ce_pct: 7.5, pe_pct: 6.5, ce_strike: 13384, pe_strike: 11641, probability: 0.84, expected_return: 0.026, sharpe: 1.51 },
  { symbol: "NIFTYNXT50", spot: 68245.00, ce_pct: 8.0, pe_pct: 7.0, ce_strike: 73705, pe_strike: 63468, probability: 0.83, expected_return: 0.024, sharpe: 1.45 },
];

export default function MonthlyIndexPage() {
  const [data, setData] = useState(sampleMonthlyData);

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
                {data.map(row => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Search } from "lucide-react";
import { fetchStockRecommendations } from "../../../lib/api";

const sampleStocks = [
  { rank: 1, symbol: "RELIANCE", spot: 2945.80, ce_pct: 7.0, pe_pct: 6.0, probability: 0.82, expected_return: 0.035, risk_score: 0.28 },
  { rank: 2, symbol: "HDFCBANK", spot: 1789.45, ce_pct: 6.5, pe_pct: 5.5, probability: 0.84, expected_return: 0.033, risk_score: 0.25 },
  { rank: 3, symbol: "TCS", spot: 3892.20, ce_pct: 8.0, pe_pct: 7.0, probability: 0.86, expected_return: 0.031, risk_score: 0.22 },
  { rank: 4, symbol: "INFY", spot: 1567.30, ce_pct: 7.5, pe_pct: 6.5, probability: 0.85, expected_return: 0.030, risk_score: 0.24 },
  { rank: 5, symbol: "ICICIBANK", spot: 1342.60, ce_pct: 6.0, pe_pct: 5.0, probability: 0.83, expected_return: 0.029, risk_score: 0.27 },
  { rank: 6, symbol: "SBIN", spot: 842.15, ce_pct: 8.5, pe_pct: 7.5, probability: 0.80, expected_return: 0.028, risk_score: 0.32 },
  { rank: 7, symbol: "BHARTIARTL", spot: 1678.90, ce_pct: 7.0, pe_pct: 6.0, probability: 0.81, expected_return: 0.027, risk_score: 0.30 },
  { rank: 8, symbol: "WIPRO", spot: 458.35, ce_pct: 9.0, pe_pct: 8.0, probability: 0.87, expected_return: 0.026, risk_score: 0.20 },
  { rank: 9, symbol: "TATAMOTORS", spot: 724.50, ce_pct: 10.0, pe_pct: 9.0, probability: 0.78, expected_return: 0.025, risk_score: 0.35 },
  { rank: 10, symbol: "KOTAKBANK", spot: 1956.20, ce_pct: 6.5, pe_pct: 5.5, probability: 0.84, expected_return: 0.024, risk_score: 0.26 },
];

export default function StocksPage() {
  const [data, setData] = useState(sampleStocks);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const result = await fetchStockRecommendations();
        if (result && result.length > 0) {
          const mapped = result.map(r => ({
            rank: r.rank,
            symbol: r.symbol,
            spot: r.spot_price ?? 0,
            ce_pct: r.recommended_ce_pct ?? 0,
            pe_pct: r.recommended_pe_pct ?? 0,
            probability: r.combined_probability ?? 0,
            expected_return: r.expected_return ?? 0,
            risk_score: r.risk_score ?? 0,
          }));
          setData(mapped);
        }
      } catch (err) {
        console.error("Failed to load stock recommendations:", err);
      }
    }
    loadData();
  }, []);

  const filtered = data.filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <BarChart3 size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-purple)" }} />
          F&O Stocks — Monthly Recommendations
        </h1>
        <p className="page-subtitle">Top stocks ranked by expected return from option selling</p>
      </div>
      <div className="page-body">
        {/* Search */}
        <div style={{ marginBottom: "1.25rem", position: "relative", maxWidth: 400 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search symbol..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "0.625rem 1rem 0.625rem 2.5rem",
              background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-md)", color: "var(--text-primary)",
              fontFamily: "var(--font-sans)", fontSize: "0.875rem", outline: "none",
            }}
          />
        </div>

        <div className="glass-card" style={{ padding: "1.5rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  {["#", "Symbol", "Spot", "Best CE%", "Best PE%", "Probability", "Exp Return", "Risk Score"].map(h => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.symbol} style={{ borderBottom: "1px solid var(--border-glass)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "0.875rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>{row.rank}</td>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{row.symbol}</td>
                    <td style={{ padding: "0.875rem 1rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>₹{row.spot.toLocaleString("en-IN")}</td>
                    <td style={{ padding: "0.875rem 1rem" }}><span className="badge badge-danger"><TrendingUp size={12} style={{ marginRight: 3 }} />+{row.ce_pct}%</span></td>
                    <td style={{ padding: "0.875rem 1rem" }}><span className="badge badge-success"><TrendingDown size={12} style={{ marginRight: 3 }} />-{row.pe_pct}%</span></td>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 600, color: row.probability > 0.82 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{(row.probability * 100).toFixed(0)}%</td>
                    <td style={{ padding: "0.875rem 1rem", fontWeight: 700, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>{(row.expected_return * 100).toFixed(1)}%</td>
                    <td style={{ padding: "0.875rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 50, height: 6, background: "var(--bg-tertiary)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${row.risk_score * 100}%`, height: "100%", background: row.risk_score > 0.3 ? "var(--accent-red)" : row.risk_score > 0.2 ? "var(--accent-amber)" : "var(--accent-emerald)", borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>{row.risk_score.toFixed(2)}</span>
                      </div>
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

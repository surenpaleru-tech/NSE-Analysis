"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Search } from "lucide-react";
import { fetchStockRecommendations } from "../../../lib/api";

export default function StocksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      } finally {
        setLoading(false);
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
                {loading ? (
                  Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border-glass)" }}>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 30 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 80 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 80 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 60 }} /></td>
                      <td style={{ padding: "0.875rem 1rem" }}><div className="skeleton" style={{ height: 16, width: 100 }} /></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                      {search ? "No matching stock recommendations found." : "No stock recommendations found in database."}
                    </td>
                  </tr>
                ) : (
                  filtered.map(row => (
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

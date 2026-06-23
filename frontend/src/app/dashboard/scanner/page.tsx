"use client";

import { useState } from "react";
import { Zap, TrendingUp, TrendingDown, Filter } from "lucide-react";

const sampleOpportunities = [
  { rank: 1, symbol: "RELIANCE", type: "stock", expiry: "monthly", spot: 2945.80, ce_pct: 7.0, pe_pct: 6.0, probability: 0.82, expected_return: 0.035, risk_score: 0.28, regime: "sideways" },
  { rank: 2, symbol: "NIFTY", type: "index", expiry: "weekly", spot: 24856.50, ce_pct: 3.5, pe_pct: 3.0, probability: 0.91, expected_return: 0.024, risk_score: 0.15, regime: "sideways" },
  { rank: 3, symbol: "HDFCBANK", type: "stock", expiry: "monthly", spot: 1789.45, ce_pct: 6.5, pe_pct: 5.5, probability: 0.84, expected_return: 0.033, risk_score: 0.25, regime: "bull" },
  { rank: 4, symbol: "BANKNIFTY", type: "index", expiry: "weekly", spot: 54230.00, ce_pct: 4.0, pe_pct: 3.5, probability: 0.88, expected_return: 0.021, risk_score: 0.18, regime: "sideways" },
  { rank: 5, symbol: "TCS", type: "stock", expiry: "monthly", spot: 3892.20, ce_pct: 8.0, pe_pct: 7.0, probability: 0.86, expected_return: 0.031, risk_score: 0.22, regime: "bull" },
  { rank: 6, symbol: "INFY", type: "stock", expiry: "monthly", spot: 1567.30, ce_pct: 7.5, pe_pct: 6.5, probability: 0.85, expected_return: 0.030, risk_score: 0.24, regime: "sideways" },
  { rank: 7, symbol: "FINNIFTY", type: "index", expiry: "weekly", spot: 25320.75, ce_pct: 3.5, pe_pct: 3.0, probability: 0.90, expected_return: 0.023, risk_score: 0.16, regime: "sideways" },
  { rank: 8, symbol: "ICICIBANK", type: "stock", expiry: "monthly", spot: 1342.60, ce_pct: 6.0, pe_pct: 5.0, probability: 0.83, expected_return: 0.029, risk_score: 0.27, regime: "bull" },
];

export default function ScannerPage() {
  const [sortBy, setSortBy] = useState("expected_return");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = sampleOpportunities
    .filter(o => typeFilter === "all" || o.type === typeFilter)
    .sort((a, b) => {
      if (sortBy === "expected_return") return (b.expected_return ?? 0) - (a.expected_return ?? 0);
      if (sortBy === "probability") return (b.probability ?? 0) - (a.probability ?? 0);
      if (sortBy === "risk_score") return (a.risk_score ?? 1) - (b.risk_score ?? 1);
      return 0;
    });

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <Zap size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-amber)" }} />
          Opportunity Scanner
        </h1>
        <p className="page-subtitle">Real-time ranked opportunities across indices and stocks</p>
      </div>
      <div className="page-body">
        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          <Filter size={16} style={{ color: "var(--text-muted)" }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: "0.5rem 1rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.85rem" }}>
            <option value="expected_return">Expected Return</option>
            <option value="probability">Probability</option>
            <option value="risk_score">Risk Score (Low → High)</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            style={{ padding: "0.5rem 1rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.85rem" }}>
            <option value="all">All Types</option>
            <option value="index">Index Only</option>
            <option value="stock">Stock Only</option>
          </select>
        </div>

        {/* Grid Cards */}
        <div className="grid-3col">
          {filtered.map((opp, idx) => (
            <div
              key={opp.symbol + opp.expiry}
              className="glass-card animate-fade-in"
              style={{ padding: "1.25rem", animationDelay: `${idx * 50}ms` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text-primary)" }}>{opp.symbol}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {opp.type === "index" ? "Index" : "Stock"} · {opp.expiry}
                  </div>
                </div>
                <span className={`badge badge-${opp.regime === "bull" ? "success" : opp.regime === "bear" ? "danger" : "info"}`}>
                  {opp.regime}
                </span>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 4 }}>Spot</div>
              <div style={{ fontSize: "1.15rem", fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                ₹{opp.spot.toLocaleString("en-IN")}
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                <span className="badge badge-danger" style={{ flex: 1, justifyContent: "center" }}>
                  <TrendingUp size={12} />
                  CE +{opp.ce_pct}%
                </span>
                <span className="badge badge-success" style={{ flex: 1, justifyContent: "center" }}>
                  <TrendingDown size={12} />
                  PE -{opp.pe_pct}%
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Prob</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: opp.probability > 0.85 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
                    {(opp.probability * 100).toFixed(0)}%
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Return</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                    {(opp.expected_return * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Risk</div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: opp.risk_score > 0.3 ? "var(--accent-red)" : "var(--accent-blue)" }}>
                    {opp.risk_score.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

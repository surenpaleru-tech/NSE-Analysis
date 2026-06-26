"use client";

import { useState, useEffect } from "react";
import { Zap, TrendingUp, TrendingDown, Filter } from "lucide-react";
import { fetchOpportunities } from "../../../lib/api";

export default function ScannerPage() {
  const [sortBy, setSortBy] = useState("expected_return");
  const [typeFilter, setTypeFilter] = useState("all");
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetchOpportunities(sortBy);
        if (res && res.opportunities) {
          const mapped = res.opportunities.map((o, idx) => ({
            rank: idx + 1,
            symbol: o.symbol,
            type: o.instrument_type,
            expiry: o.expiry_type,
            spot: o.spot_price ?? 0,
            ce_pct: o.recommended_ce_pct ?? 0,
            pe_pct: o.recommended_pe_pct ?? 0,
            probability: o.combined_probability ?? 0,
            expected_return: o.expected_return ?? 0,
            risk_score: o.risk_score ?? 0,
            regime: o.market_regime ?? "sideways",
          }));
          setOpportunities(mapped);
        }
      } catch (err) {
        console.error("Failed to load scanner opportunities:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [sortBy]);

  const filtered = opportunities
    .filter(o => typeFilter === "all" || o.type === typeFilter);

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
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="glass-card animate-fade-in" style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <div className="skeleton" style={{ height: 20, width: 100, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 14, width: 80 }} />
                  </div>
                  <div className="skeleton" style={{ height: 20, width: 60, borderRadius: 100 }} />
                </div>
                <div className="skeleton" style={{ height: 12, width: 40, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 24, width: 120, marginBottom: "1rem" }} />
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div className="skeleton" style={{ height: 24, flex: 1, borderRadius: 100 }} />
                  <div className="skeleton" style={{ height: 24, flex: 1, borderRadius: 100 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                  <div className="skeleton" style={{ height: 32 }} />
                  <div className="skeleton" style={{ height: 32 }} />
                  <div className="skeleton" style={{ height: 32 }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <p>No opportunities matching filters found in database.</p>
            </div>
          ) : (
            filtered.map((opp, idx) => (
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
            ))
          )}
        </div>
      </div>
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Zap, TrendingUp, TrendingDown, Filter, Search, X, ArrowRight, DollarSign } from "lucide-react";
import { fetchOpportunities, fetchStrategyHistory } from "../../../lib/api";

export default function ScannerPage() {
  const [sortBy, setSortBy] = useState("expected_return");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Split-screen selection states
  const [selectedOpp, setSelectedOpp] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Expiries (ongoing vs next month) tab states
  const [expiriesInfo, setExpiriesInfo] = useState<any | null>(null);
  const [activeExpiryTab, setActiveExpiryTab] = useState<"ongoing" | "next">("ongoing");

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
            ce_strike: o.recommended_ce_strike ?? 0,
            pe_strike: o.recommended_pe_strike ?? 0,
            ce_premium: o.ce_premium ?? null,
            pe_premium: o.pe_premium ?? null,
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

  // Reset selected item if layout filters change
  useEffect(() => {
    setSelectedOpp(null);
  }, [sortBy, typeFilter]);

  // Reset active tab to ongoing when selection changes
  useEffect(() => {
    setActiveExpiryTab("ongoing");
  }, [selectedOpp]);

  // Fetch backtest results & multi-expiry premiums when symbol is selected
  useEffect(() => {
    if (!selectedOpp) {
      setHistory([]);
      setExpiriesInfo(null);
      return;
    }
    async function loadHistory() {
      try {
        setHistoryLoading(true);
        const res = await fetchStrategyHistory(
          selectedOpp.symbol,
          selectedOpp.expiry,
          selectedOpp.ce_pct,
          selectedOpp.pe_pct
        );
        if (res) {
          setHistory(res.results || []);
          setExpiriesInfo(res.expiries_info || null);
        } else {
          setHistory([]);
          setExpiriesInfo(null);
        }
      } catch (err) {
        console.error("Failed to load strategy history:", err);
        setHistory([]);
        setExpiriesInfo(null);
      } finally {
        setHistoryLoading(false);
      }
    }
    loadHistory();
  }, [selectedOpp]);

  const filtered = opportunities
    .filter(o => typeFilter === "all" || o.type === typeFilter)
    .filter(o => o.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

  // Retrieve active tab's calculated strikes and premiums (LTP)
  const activeExpiryData = expiriesInfo ? expiriesInfo[activeExpiryTab] : null;

  // Construct ongoing record dynamically if activeExpiryData is available and it is the ongoing tab
  const ongoingRecord = (activeExpiryTab === "ongoing" && activeExpiryData) ? {
    expiry: activeExpiryData.expiry_date,
    spot_at_entry: activeExpiryData.spot,
    spot_at_expiry: null,
    ce_entry_premium: activeExpiryData.ce_premium,
    ce_expiry_premium: null,
    pe_entry_premium: activeExpiryData.pe_premium,
    pe_expiry_premium: null,
    return_pct: null,
  } : null;

  const filteredHistory = ongoingRecord 
    ? history.filter(h => h.expiry !== ongoingRecord.expiry)
    : history;

  const displayHistory = ongoingRecord 
    ? [ongoingRecord, ...filteredHistory]
    : filteredHistory;

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
        {/* Search & Filters Row */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          <Filter size={16} style={{ color: "var(--text-muted)" }} />
          
          {/* Search Box */}
          <div style={{ position: "relative", flex: "1 1 200px", maxWidth: "300px" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search symbol (e.g. NIFTY, TCS)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 1rem 0.5rem 2.25rem",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-primary)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-sans)",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
          </div>

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

        {/* Master-Detail Split Screen Layout */}
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", position: "relative" }}>
          
          {/* Opportunities Left Grid/List */}
          <div style={{ flex: 1 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: selectedOpp ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
              gap: "1.25rem",
              transition: "all var(--transition-base)"
            }}>
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
                  <p>No opportunities matching filters or search terms found.</p>
                </div>
              ) : (
                filtered.map((opp, idx) => {
                  const isSelected = selectedOpp?.symbol === opp.symbol && selectedOpp?.expiry === opp.expiry;
                  return (
                    <div
                      key={opp.symbol + opp.expiry}
                      className="glass-card animate-fade-in"
                      onClick={() => setSelectedOpp(opp)}
                      style={{
                        padding: "1.25rem",
                        animationDelay: `${idx * 40}ms`,
                        cursor: "pointer",
                        border: isSelected ? "2px solid var(--accent-blue)" : "1px solid var(--border-primary)",
                        boxShadow: isSelected ? "var(--shadow-glow-blue)" : "var(--shadow-sm)",
                        transform: isSelected ? "translateY(-2px)" : "none",
                        transition: "all var(--transition-fast)"
                      }}
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
                  );
                })
              )}
            </div>
          </div>

          {/* Right sticky backtest panel — Wider and filled */}
          {selectedOpp && (
            <div
              className="glass-card animate-slide-in"
              style={{
                flex: "0 0 48%",
                position: "sticky",
                top: "20px",
                maxHeight: "calc(100vh - 120px)",
                display: "flex",
                flexDirection: "column",
                padding: "1.5rem",
                border: "1px solid var(--border-accent)",
                boxShadow: "var(--shadow-lg)"
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    {selectedOpp.symbol} Backtest
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {activeExpiryData ? `${activeExpiryData.expiry_month} Expiry (${activeExpiryData.expiry_label})` : (selectedOpp.expiry === "weekly" ? "Weekly" : "Monthly")} Option Selling
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOpp(null)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "none",
                    borderRadius: "50%",
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "background var(--transition-fast)"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Expiry Selector Tabs */}
              {expiriesInfo && (
                <div style={{ display: "flex", borderBottom: "1px solid var(--border-primary)", marginBottom: "1.25rem", gap: "0.5rem" }}>
                  {expiriesInfo.ongoing && (
                    <button
                      onClick={() => setActiveExpiryTab("ongoing")}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeExpiryTab === "ongoing" ? "3px solid var(--accent-blue)" : "3px solid transparent",
                        color: activeExpiryTab === "ongoing" ? "var(--text-primary)" : "var(--text-muted)",
                        fontWeight: activeExpiryTab === "ongoing" ? 700 : 500,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        transition: "all var(--transition-fast)"
                      }}
                    >
                      {expiriesInfo.ongoing.expiry_month} Expiry ({expiriesInfo.ongoing.expiry_label})
                    </button>
                  )}
                  {expiriesInfo.next && (
                    <button
                      onClick={() => setActiveExpiryTab("next")}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "none",
                        border: "none",
                        borderBottom: activeExpiryTab === "next" ? "3px solid var(--accent-blue)" : "3px solid transparent",
                        color: activeExpiryTab === "next" ? "var(--text-primary)" : "var(--text-muted)",
                        fontWeight: activeExpiryTab === "next" ? 700 : 500,
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        transition: "all var(--transition-fast)"
                      }}
                    >
                      {expiriesInfo.next.expiry_month} Expiry ({expiriesInfo.next.expiry_label})
                    </button>
                  )}
                </div>
              )}

              {/* Data Content */}
              {historyLoading ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem", justifyContent: "center" }}>
                  <div className="skeleton" style={{ height: 120, borderRadius: "var(--radius-lg)" }} />
                  <div className="skeleton" style={{ height: 180, borderRadius: "var(--radius-lg)" }} />
                </div>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  
                  {/* Suggested Option Trades Card (actionable option info) */}
                  <div style={{
                    background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08))",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1.25rem",
                    marginBottom: "1.25rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <DollarSign size={16} style={{ color: "var(--accent-blue)" }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Suggested Option Trades
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", background: "rgba(0,0,0,0.2)", padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {activeExpiryTab === "ongoing" ? "Current" : "Next"} Spot LTP:
                      </span>
                      <span style={{ fontSize: "0.95rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                        ₹{activeExpiryData ? activeExpiryData.spot.toLocaleString("en-IN") : selectedOpp.spot.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      
                      {/* CE option trade */}
                      <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Sell CE Option</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-red)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                          {activeExpiryData?.ce_strike ? activeExpiryData.ce_strike.toLocaleString("en-IN") : Math.round(selectedOpp.spot * (1 + selectedOpp.ce_pct/100))} CE
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 1 }}>
                          (Suggested +{selectedOpp.ce_pct}%)
                        </div>
                        <div style={{ borderTop: "1px dashed rgba(239, 68, 68, 0.15)", marginTop: 8, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>LTP (Premium):</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                            {activeExpiryData?.ce_premium !== null && activeExpiryData?.ce_premium !== undefined
                              ? `₹${activeExpiryData.ce_premium.toFixed(2)}`
                              : selectedOpp.ce_premium !== null ? `₹${selectedOpp.ce_premium.toFixed(2)}` : "₹0.00"}
                          </span>
                        </div>
                      </div>

                      {/* PE option trade */}
                      <div style={{ background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.15)", padding: "0.75rem", borderRadius: "var(--radius-md)" }}>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Sell PE Option</div>
                        <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--accent-emerald)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                          {activeExpiryData?.pe_strike ? activeExpiryData.pe_strike.toLocaleString("en-IN") : Math.round(selectedOpp.spot * (1 - selectedOpp.pe_pct/100))} PE
                        </div>
                        <div style={{ fontSize: "0.65rem", color: "var(--text-secondary)", marginTop: 1 }}>
                          (Suggested -{selectedOpp.pe_pct}%)
                        </div>
                        <div style={{ borderTop: "1px dashed rgba(16, 185, 129, 0.15)", marginTop: 8, paddingTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>LTP (Premium):</span>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                            {activeExpiryData?.pe_premium !== null && activeExpiryData?.pe_premium !== undefined
                              ? `₹${activeExpiryData.pe_premium.toFixed(2)}`
                              : selectedOpp.pe_premium !== null ? `₹${selectedOpp.pe_premium.toFixed(2)}` : "₹0.00"}
                          </span>
                        </div>
                      </div>
                      
                    </div>
                  </div>

                  {/* Summary performance card */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "1rem",
                    background: "rgba(0, 0, 0, 0.15)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1.25rem"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Win Rate</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-emerald)", marginTop: 2 }}>
                        {history.length > 0 ? ((history.filter(h => h.ce_expired_worthless && h.pe_expired_worthless).length / history.length) * 100).toFixed(0) : "0"}%
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>
                        {history.filter(h => h.ce_expired_worthless && h.pe_expired_worthless).length} / {history.length} Expiries Worthless
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Avg Return</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-blue)", marginTop: 2 }}>
                        {history.length > 0 ? (history.reduce((acc, h) => acc + (h.return_pct ?? 0), 0) / history.length).toFixed(2) : "0.00"}%
                      </div>
                      <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: 1 }}>
                        Expected P&L: {history.length > 0 ? (history.reduce((acc, h) => acc + (h.total_pnl ?? 0), 0) / history.length).toFixed(1) : "0.0"} pts
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Backtest Table */}
                  <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.25rem" }}>
                    {displayHistory.length === 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", color: "var(--text-muted)", textAlign: "center" }}>
                        <p style={{ fontSize: "0.9rem" }}>No backtest strategy results found for this specific CE/PE percentage combination.</p>
                      </div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border-primary)", color: "var(--text-muted)" }}>
                            <th style={{ padding: "0.5rem", fontWeight: 600 }}>Expiry</th>
                            <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>Spot (Entry → Expiry)</th>
                            <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>CE (Entry → Exit)</th>
                            <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>PE (Entry → Exit)</th>
                            <th style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>Return %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayHistory.map((record, index) => {
                            return (
                              <tr key={index} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                <td style={{ padding: "0.75rem 0.5rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                                  {new Date(record.expiry).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                </td>
                                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                                  {record.spot_at_entry !== null && record.spot_at_entry !== undefined ? record.spot_at_entry.toFixed(0) : "-"} → {record.spot_at_expiry !== null && record.spot_at_expiry !== undefined ? record.spot_at_expiry.toFixed(0) : "-"}
                                </td>
                                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                                  {record.ce_entry_premium !== null && record.ce_entry_premium !== undefined ? record.ce_entry_premium.toFixed(1) : "-"} → {record.ce_expiry_premium !== null && record.ce_expiry_premium !== undefined ? record.ce_expiry_premium.toFixed(1) : "-"}
                                </td>
                                <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                                  {record.pe_entry_premium !== null && record.pe_entry_premium !== undefined ? record.pe_entry_premium.toFixed(1) : "-"} → {record.pe_expiry_premium !== null && record.pe_expiry_premium !== undefined ? record.pe_expiry_premium.toFixed(1) : "-"}
                                </td>
                                <td style={{
                                  padding: "0.75rem 0.5rem",
                                  textAlign: "right",
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 700,
                                  color: record.return_pct !== null && record.return_pct !== undefined
                                    ? (record.return_pct >= 0 ? "var(--accent-emerald)" : "var(--accent-red)")
                                    : "var(--text-muted)"
                                }}>
                                  {record.return_pct !== null && record.return_pct !== undefined
                                    ? `${record.return_pct >= 0 ? "+" : ""}${record.return_pct.toFixed(1)}%`
                                    : "Ongoing"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                  
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

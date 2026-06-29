"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LineChart, Search, ChevronRight, Waves, Layers } from "lucide-react";
import { fetchStockRecommendations } from "@/lib/api";

// Fallback universe if the database is completely empty/truncated
const FALLBACK_UNIVERSE = [
  { symbol: "NIFTY", name: "NIFTY 50 Index", type: "index" },
  { symbol: "BANKNIFTY", name: "NIFTY Bank Index", type: "index" },
  { symbol: "FINNIFTY", name: "NIFTY Financial Services Index", type: "index" },
  { symbol: "SBIN", name: "State Bank of India", type: "stock" },
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", type: "stock" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", type: "stock" },
  { symbol: "INFY", name: "Infosys Ltd", type: "stock" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", type: "stock" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", type: "stock" },
  { symbol: "ITC", name: "ITC Ltd", type: "stock" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", type: "stock" },
  { symbol: "TATASTEEL", name: "Tata Steel Ltd", type: "stock" },
];

export default function OptionHistorySearchPage() {
  const [stocks, setStocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadStocks() {
      try {
        const data = await fetchStockRecommendations();
        if (data && data.length > 0) {
          const list = data.map((item) => ({
            symbol: item.symbol,
            name: `${item.symbol} Option Chain`,
            type: "stock",
            spot: item.spot_price,
          }));
          
          // Prepend indices which aren't in the stock recommendations endpoint
          const indices = [
            { symbol: "NIFTY", name: "NIFTY 50 Index", type: "index" },
            { symbol: "BANKNIFTY", name: "NIFTY Bank Index", type: "index" },
            { symbol: "FINNIFTY", name: "NIFTY Financial Services Index", type: "index" }
          ];
          setStocks([...indices, ...list]);
        } else {
          setStocks(FALLBACK_UNIVERSE);
        }
      } catch (error) {
        console.error("Failed to load active stock symbols:", error);
        setStocks(FALLBACK_UNIVERSE);
      } finally {
        setLoading(false);
      }
    }
    loadStocks();
  }, []);

  const filtered = stocks.filter((s) =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const indices = filtered.filter((s) => s.type === "index");
  const equities = filtered.filter((s) => s.type === "stock");

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <LineChart size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-purple)" }} />
          Option History Explorer
        </h1>
        <p className="page-subtitle">Track day-by-day options value decay and spot fluctuations across expiry months</p>
      </div>

      <div className="page-body">
        {/* Search Input */}
        <div style={{ marginBottom: "2rem", position: "relative", maxWidth: 500 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search stock or index symbol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem 1rem 0.75rem 2.75rem",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-primary)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-sans)",
              fontSize: "0.95rem",
              outline: "none",
              boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        {/* Index Section */}
        {indices.length > 0 && (
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
              <Layers size={16} /> Indices
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {indices.map((idx) => (
                <Link key={idx.symbol} href={`/dashboard/option-history/${idx.symbol}`} className="glass-card" style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", transition: "transform 0.2s, background 0.2s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.background = "transparent";
                  }}>
                  <div>
                    <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>{idx.symbol}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{idx.name}</div>
                  </div>
                  <ChevronRight size={20} style={{ color: "var(--text-muted)" }} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Equities Section */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
            <Waves size={16} /> F&O Equity Stocks
          </h2>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="glass-card" style={{ padding: "1.25rem 1.5rem", height: 75 }}>
                  <div className="skeleton" style={{ height: 18, width: 80, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, width: 140 }} />
                </div>
              ))}
            </div>
          ) : equities.length === 0 ? (
            <div className="glass-card" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
              No matching assets found.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {equities.map((eq) => (
                <Link key={eq.symbol} href={`/dashboard/option-history/${eq.symbol}`} className="glass-card" style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", transition: "transform 0.2s, background 0.2s" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.background = "transparent";
                  }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>{eq.symbol}</span>
                      {eq.spot && (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>₹{eq.spot.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{eq.name}</div>
                  </div>
                  <ChevronRight size={20} style={{ color: "var(--text-muted)" }} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

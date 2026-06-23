"use client";

import { useState, useMemo } from "react";
import { Crosshair } from "lucide-react";

// Generate sample heatmap data (13x13 grid: 1% to 13% for both CE and PE)
const OTM_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

function generateHeatmapData() {
  const data: { ce: number; pe: number; value: number }[] = [];
  for (const ce of OTM_RANGE) {
    for (const pe of OTM_RANGE) {
      // Simulate expected value: higher in middle, lower at extremes
      const base = 2.5;
      const ceFactor = Math.exp(-((ce - 6) ** 2) / 18);
      const peFactor = Math.exp(-((pe - 5) ** 2) / 18);
      const value = base * ceFactor * peFactor + (Math.random() - 0.5) * 0.5;
      data.push({ ce, pe, value: Math.max(-2, Math.min(5, value)) });
    }
  }
  return data;
}

function getHeatColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min || 1);
  if (normalized > 0.7) return `rgba(16, 185, 129, ${0.3 + normalized * 0.6})`;
  if (normalized > 0.4) return `rgba(245, 158, 11, ${0.3 + normalized * 0.5})`;
  return `rgba(239, 68, 68, ${0.3 + (1 - normalized) * 0.5})`;
}

export default function BandExplorerPage() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [metric, setMetric] = useState("expected_value");
  const heatmapData = useMemo(generateHeatmapData, []);

  const values = heatmapData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // Find optimal cell
  const optimal = heatmapData.reduce((best, d) => d.value > best.value ? d : best, heatmapData[0]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <Crosshair size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-cyan)" }} />
          Band Explorer — Heatmap
        </h1>
        <p className="page-subtitle">Explore CE/PE combinations interactively. Brighter green = higher expected value.</p>
      </div>
      <div className="page-body">
        {/* Controls */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            style={{ padding: "0.5rem 1rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.85rem" }}
          >
            {["NIFTY", "BANKNIFTY", "FINNIFTY", "RELIANCE", "HDFCBANK", "TCS", "INFY"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            style={{ padding: "0.5rem 1rem", background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontFamily: "var(--font-sans)", fontSize: "0.85rem" }}
          >
            <option value="expected_value">Expected Value</option>
            <option value="win_rate">Win Rate</option>
            <option value="sharpe_ratio">Sharpe Ratio</option>
            <option value="probability_expire_worthless">Prob. Expire Worthless</option>
          </select>
        </div>

        <div className="grid-2col">
          {/* Heatmap */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>
              CE% vs PE% — {metric.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </h3>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              {/* Y-axis label */}
              <div style={{ display: "flex", alignItems: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                PE % (below spot)
              </div>

              <div>
                {/* X-axis labels */}
                <div style={{ display: "grid", gridTemplateColumns: `30px repeat(${OTM_RANGE.length}, 1fr)`, gap: 2, marginBottom: 4 }}>
                  <div />
                  {OTM_RANGE.map(ce => (
                    <div key={ce} style={{ textAlign: "center", fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500 }}>{ce}%</div>
                  ))}
                </div>

                {/* Grid */}
                {OTM_RANGE.map(pe => (
                  <div key={pe} style={{ display: "grid", gridTemplateColumns: `30px repeat(${OTM_RANGE.length}, 1fr)`, gap: 2, marginBottom: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 6, fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 500 }}>{pe}%</div>
                    {OTM_RANGE.map(ce => {
                      const cell = heatmapData.find(d => d.ce === ce && d.pe === pe);
                      const val = cell?.value ?? 0;
                      const isOptimal = ce === optimal.ce && pe === optimal.pe;
                      return (
                        <div
                          key={`${ce}-${pe}`}
                          className="heatmap-cell"
                          title={`CE: +${ce}%, PE: -${pe}% → ${val.toFixed(2)}`}
                          style={{
                            background: getHeatColor(val, minVal, maxVal),
                            color: "var(--text-primary)",
                            fontSize: "0.6rem",
                            width: "100%",
                            minWidth: 32,
                            minHeight: 32,
                            border: isOptimal ? "2px solid var(--accent-blue)" : "none",
                            boxShadow: isOptimal ? "var(--shadow-glow-blue)" : "none",
                          }}
                        >
                          {val.toFixed(1)}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* X-axis title */}
                <div style={{ textAlign: "center", marginTop: 8, fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600 }}>
                  CE % (above spot)
                </div>
              </div>
            </div>
          </div>

          {/* Optimal Band Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "1rem", color: "var(--text-primary)" }}>
                🎯 Optimal Band — {symbol}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div className="metric-label">CE (Sell Above)</div>
                  <div className="metric-value" style={{ fontSize: "1.5rem", color: "var(--accent-red)" }}>+{optimal.ce}%</div>
                </div>
                <div>
                  <div className="metric-label">PE (Sell Below)</div>
                  <div className="metric-value" style={{ fontSize: "1.5rem", color: "var(--accent-emerald)" }}>-{optimal.pe}%</div>
                </div>
                <div>
                  <div className="metric-label">Expected Value</div>
                  <div className="metric-value" style={{ fontSize: "1.5rem" }}>{optimal.value.toFixed(2)}</div>
                </div>
                <div>
                  <div className="metric-label">Analysis Period</div>
                  <div className="metric-value" style={{ fontSize: "1.5rem" }}>1Y</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="glass-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--text-primary)" }}>Color Legend</h3>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(239, 68, 68, 0.6)" }} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Low</span>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(245, 158, 11, 0.6)", marginLeft: 8 }} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Medium</span>
                <div style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(16, 185, 129, 0.7)", marginLeft: 8 }} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>High</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem", lineHeight: 1.5 }}>
                Blue-bordered cell = optimal combination. Hover cells for exact values.
                Higher expected value indicates better risk-adjusted returns from selling at that CE/PE distance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

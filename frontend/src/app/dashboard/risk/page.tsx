"use client";

import { useState, useEffect } from "react";
import { Shield, TrendingDown, Activity, BarChart3 } from "lucide-react";
import { fetchComparison, fetchStrategyHistory } from "../../../lib/api";

// Generate sample data
const generatePnLData = () => {
  const data = [];
  let cumulative = 0;
  let peak = 0;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  for (let i = 0; i < 24; i++) {
    const ret = parseFloat(((Math.random() - 0.28) * 3).toFixed(2));
    cumulative = parseFloat((cumulative + ret).toFixed(2));
    peak = Math.max(peak, cumulative);
    data.push({
      month: months[i % 12] + (i < 12 ? " '23" : " '24"),
      pnl: ret,
      cumulative,
      drawdown: parseFloat((cumulative - peak).toFixed(2)),
    });
  }
  return data;
};

const samplePnL = generatePnLData();

const riskMetrics = [
  { symbol: "NIFTY", sharpe: 1.85, sortino: 2.34, calmar: 1.62, maxDD: -4.2, winRate: 84, kelly: 0.18 },
  { symbol: "BANKNIFTY", sharpe: 1.62, sortino: 2.01, calmar: 1.28, maxDD: -5.8, winRate: 81, kelly: 0.14 },
  { symbol: "FINNIFTY", sharpe: 1.78, sortino: 2.20, calmar: 1.51, maxDD: -4.9, winRate: 83, kelly: 0.17 },
  { symbol: "RELIANCE", sharpe: 1.43, sortino: 1.89, calmar: 1.12, maxDD: -7.2, winRate: 79, kelly: 0.12 },
  { symbol: "HDFCBANK", sharpe: 1.55, sortino: 1.95, calmar: 1.23, maxDD: -6.1, winRate: 80, kelly: 0.15 },
];

// ─── Minimal SVG Line/Area Chart ─────────────────────────────────────────────
function MiniChart({
  data,
  valueKey,
  color,
  height = 180,
}: {
  data: any[];
  valueKey: string;
  color: string;
  height?: number;
}) {
  const width = 100;
  const values = data.map(d => d[valueKey] as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 20) - 10;
    return `${x},${y}`;
  });

  const fillPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(" ");

  return (
    <svg viewBox={`0 0 100 ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}

// ─── Minimal SVG Bar Chart ────────────────────────────────────────────────────
function MiniBarChart({ data }: { data: any[] }) {
  const last12 = data.slice(-12);
  const values = last12.map(d => d.pnl);
  const max = Math.max(...values.map(Math.abs)) || 1;

  return (
    <svg viewBox="0 0 120 60" width="100%" height="100%" preserveAspectRatio="none">
      {last12.map((d, i) => {
        const barH = (Math.abs(d.pnl) / max) * 22;
        const x = i * 10 + 1;
        const y = d.pnl >= 0 ? 30 - barH : 30;
        return (
          <g key={i}>
            <rect
              x={x} y={y} width={8} height={barH}
              fill={d.pnl >= 0 ? "#10b981" : "#ef4444"}
              opacity={0.8}
              rx={1}
            />
            <text x={x + 4} y={58} textAnchor="middle" fill="#64748b" fontSize={4}>
              {d.month.split(" ")[0]}
            </text>
          </g>
        );
      })}
      <line x1={0} y1={30} x2={120} y2={30} stroke="#374151" strokeWidth={0.5} />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RiskDashboardPage() {
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY");
  const [metricsList, setMetricsList] = useState(riskMetrics);
  const [pnlHistory, setPnlHistory] = useState<any[]>(samplePnL);

  useEffect(() => {
    async function loadComparison() {
      try {
        const res = await fetchComparison("NIFTY,BANKNIFTY,FINNIFTY,MIDCPNIFTY,NIFTYNXT50");
        if (res && res.comparison && res.comparison.length > 0) {
          const mapped = res.comparison.map(c => ({
            symbol: c.symbol,
            sharpe: c.sharpe_ratio ?? 0,
            sortino: c.sortino_ratio ?? 0,
            calmar: c.calmar_ratio ?? 0,
            maxDD: (c.max_drawdown ?? 0) * 100,
            winRate: (c.combined_win_rate ?? 0) * 100,
            kelly: c.kelly_criterion ?? 0,
          }));
          setMetricsList(mapped);
        }
      } catch (err) {
        console.error("Failed to load comparative risk metrics:", err);
      }
    }
    loadComparison();
  }, []);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetchStrategyHistory(selectedSymbol);
        if (res && res.results && res.results.length > 0) {
          const chronological = [...res.results].reverse();
          let cumulative = 0;
          let peak = 0;
          const mapped = chronological.map(r => {
            const val = (r.return_pct ?? 0) * 100; // to percentage
            cumulative = parseFloat((cumulative + val).toFixed(2));
            peak = Math.max(peak, cumulative);
            
            let monthLabel = r.expiry;
            try {
              const d = new Date(r.expiry);
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              monthLabel = months[d.getMonth()] + " '" + String(d.getFullYear()).slice(-2);
            } catch {
              // fallback to raw date
            }

            return {
              month: monthLabel,
              pnl: val,
              cumulative,
              drawdown: parseFloat((cumulative - peak).toFixed(2)),
            };
          });
          setPnlHistory(mapped);
        }
      } catch (err) {
        console.error("Failed to load historical PnL details for selected symbol:", err);
      }
    }
    loadHistory();
  }, [selectedSymbol]);

  const selected = metricsList.find(r => r.symbol === selectedSymbol) || metricsList[0];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <Shield size={24} style={{ display: "inline", marginRight: 10, color: "var(--accent-purple)" }} />
          Risk Dashboard
        </h1>
        <p className="page-subtitle">Risk-adjusted performance metrics and drawdown analysis</p>
      </div>

      <div className="page-body">
        {/* Symbol Selector */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {riskMetrics.map(r => (
            <button key={r.symbol} onClick={() => setSelectedSymbol(r.symbol)}
              className={selectedSymbol === r.symbol ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              {r.symbol}
            </button>
          ))}
        </div>

        {/* Key Risk Metrics */}
        <div className="grid-metrics animate-fade-in" style={{ marginBottom: "1.5rem" }}>
          <RiskCard label="Sharpe Ratio" value={selected.sharpe.toFixed(2)} threshold={1.5} good="≥ 1.5 is Good" />
          <RiskCard label="Sortino Ratio" value={selected.sortino.toFixed(2)} threshold={2.0} good="≥ 2.0 is Excellent" />
          <RiskCard label="Calmar Ratio" value={selected.calmar.toFixed(2)} threshold={1.0} good="≥ 1.0 is Good" />
          <RiskCard label="Max Drawdown" value={`${selected.maxDD}%`} isNegative={true} good="Smaller is Better" />
          <RiskCard label="Win Rate" value={`${selected.winRate}%`} threshold={75} good="≥ 75% Target" />
          <RiskCard label="Kelly Criterion" value={selected.kelly.toFixed(2)} threshold={0.1} good="0.1–0.25 Optimal" />
        </div>

        <div className="grid-2col">
          {/* Cumulative P&L */}
          <div className="chart-container">
            <h3 className="chart-title">
              <Activity size={16} style={{ display: "inline", marginRight: 8, color: "var(--accent-emerald)" }} />
              Cumulative P&L — {selectedSymbol} Monthly
            </h3>
            <div style={{ height: 200 }}>
              <MiniChart data={pnlHistory} valueKey="cumulative" color="#10b981" height={180} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Jan '23</span><span>Jun '23</span><span>Jan '24</span><span>Dec '24</span>
            </div>
          </div>

          {/* Drawdown */}
          <div className="chart-container">
            <h3 className="chart-title">
              <TrendingDown size={16} style={{ display: "inline", marginRight: 8, color: "var(--accent-red)" }} />
              Drawdown Analysis
            </h3>
            <div style={{ height: 200 }}>
              <MiniChart data={pnlHistory} valueKey="drawdown" color="#ef4444" height={180} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: "0.75rem", color: "var(--text-muted)" }}>
              <span>Jan '23</span><span>Jun '23</span><span>Jan '24</span><span>Dec '24</span>
            </div>
          </div>

          {/* Monthly Returns */}
          <div className="chart-container">
            <h3 className="chart-title">
              <BarChart3 size={16} style={{ display: "inline", marginRight: 8, color: "var(--accent-blue)" }} />
              Monthly Returns (Last 12 Months)
            </h3>
            <div style={{ height: 200 }}>
              <MiniBarChart data={pnlHistory} />
            </div>
          </div>

          {/* Comparative Risk Table */}
          <div className="chart-container">
            <h3 className="chart-title">Symbol Risk Comparison</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-primary)" }}>
                  {["Symbol", "Sharpe", "Sortino", "Max DD", "Win Rate"].map(h => (
                    <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.7rem", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskMetrics.map(r => (
                  <tr key={r.symbol}
                    style={{ borderBottom: "1px solid var(--border-glass)", background: r.symbol === selectedSymbol ? "var(--bg-hover)" : "transparent", cursor: "pointer" }}
                    onClick={() => setSelectedSymbol(r.symbol)}>
                    <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600, color: r.symbol === selectedSymbol ? "var(--accent-blue)" : "var(--text-primary)" }}>{r.symbol}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontFamily: "var(--font-mono)", color: r.sharpe >= 1.5 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{r.sharpe.toFixed(2)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontFamily: "var(--font-mono)", color: r.sortino >= 2 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{r.sortino.toFixed(2)}</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontFamily: "var(--font-mono)", color: Math.abs(r.maxDD) < 5 ? "var(--accent-emerald)" : "var(--accent-red)" }}>{r.maxDD}%</td>
                    <td style={{ padding: "0.6rem 0.75rem", fontFamily: "var(--font-mono)", color: r.winRate >= 80 ? "var(--accent-emerald)" : "var(--accent-amber)" }}>{r.winRate}%</td>
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

function RiskCard({
  label, value, threshold, isNegative, good,
}: {
  label: string; value: string; threshold?: number; isNegative?: boolean; good: string;
}) {
  const numValue = parseFloat(value);
  let color = "var(--text-primary)";
  if (threshold !== undefined) {
    color = numValue >= threshold ? "var(--accent-emerald)" : numValue >= threshold * 0.7 ? "var(--accent-amber)" : "var(--accent-red)";
  } else if (isNegative) {
    color = Math.abs(numValue) < 5 ? "var(--accent-emerald)" : Math.abs(numValue) < 8 ? "var(--accent-amber)" : "var(--accent-red)";
  }
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ fontSize: "1.75rem", color }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 6 }}>{good}</div>
    </div>
  );
}

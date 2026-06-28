"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  Search,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import {
  fetchProjectionBoard,
  type ProjectionBoardResponse,
  type ProjectionRow,
} from "@/lib/api";

type InstrumentFilter = "all" | "index" | "stock";
type ExpiryFilter = "weekly" | "monthly";
type AnalysisFilter = "3m" | "6m" | "1y" | "2y" | "all";
type ModeFilter = "expected_value" | "win_rate" | "sharpe_ratio" | "min_drawdown";
type SortFilter =
  | "projection_score"
  | "combined_probability"
  | "expected_value_pct"
  | "sharpe_ratio"
  | "trade_count";

const instrumentFilters: InstrumentFilter[] = ["all", "index", "stock"];
const expiryFilters: ExpiryFilter[] = ["monthly", "weekly"];
const analysisFilters: AnalysisFilter[] = ["3m", "6m", "1y", "2y", "all"];
const modeFilters: ModeFilter[] = [
  "expected_value",
  "win_rate",
  "sharpe_ratio",
  "min_drawdown",
];

export default function ProjectionBoardPage() {
  const [instrumentType, setInstrumentType] = useState<InstrumentFilter>("all");
  const [expiryType, setExpiryType] = useState<ExpiryFilter>("monthly");
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisFilter>("1y");
  const [optimizationMode, setOptimizationMode] = useState<ModeFilter>("expected_value");
  const [sortBy, setSortBy] = useState<SortFilter>("projection_score");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<ProjectionBoardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      setLoading(true);
      try {
        const response = await fetchProjectionBoard({
          instrumentType: instrumentType === "all" ? undefined : instrumentType,
          expiryType,
          analysisPeriod,
          optimizationMode,
          sortBy,
          search: search || undefined,
          limit: 250,
        });

        if (!cancelled) {
          setData(response);
        }
      } catch (error) {
        console.error("Failed to load projection board:", error);
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBoard();
    return () => {
      cancelled = true;
    };
  }, [instrumentType, expiryType, analysisPeriod, optimizationMode, sortBy, search]);

  const rows = data?.projections ?? [];
  const summary = data?.summary;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Options Projection Board</h1>
        <p className="page-subtitle">
          Best CE and PE percentages for each symbol, projected from current spot using stored
          history
        </p>
      </div>

      <div className="page-body">
        <section className="hero-panel animate-fade-in">
          <div className="hero-copy">
            <span className="hero-eyebrow">Projection engine</span>
            <h2>
              Scan the full options universe for the cleanest short-range setups over the next
              weeks and months.
            </h2>
            <p>
              The board combines current spot, historically optimized CE and PE distances, and
              the number of matching expiry outcomes already seen in the database.
            </p>
          </div>
          <div className="hero-stat-strip">
            <div>
              <span>Symbols</span>
              <strong>{summary?.symbols ?? 0}</strong>
            </div>
            <div>
              <span>Average probability</span>
              <strong>{formatRatio(summary?.avg_probability)}</strong>
            </div>
            <div>
              <span>Average cushion</span>
              <strong>{formatPct(summary?.avg_range_width_pct)}</strong>
            </div>
          </div>
        </section>

        <div className="grid-metrics" style={{ marginTop: "1.5rem" }}>
          <MetricTile
            label="Top symbol"
            value={summary?.best_symbol ?? "--"}
            icon={<Target size={18} />}
            note={summary?.best_score !== null && summary?.best_score !== undefined ? `Score ${summary.best_score}` : "Awaiting data"}
          />
          <MetricTile
            label="Spot snapshot"
            value={summary?.spot_date ?? "--"}
            icon={<Radar size={18} />}
            note={expiryType === "monthly" ? "Monthly setup focus" : "Weekly setup focus"}
          />
          <MetricTile
            label="India VIX"
            value={summary?.vix?.toFixed(2) ?? "--"}
            icon={<Waves size={18} />}
            note={summary?.vix_date ?? "No VIX snapshot"}
          />
          <MetricTile
            label="Optimization mode"
            value={humanizeMode(optimizationMode)}
            icon={<Shield size={18} />}
            note={humanizeAnalysis(analysisPeriod)}
          />
        </div>

        <section className="control-strip">
          <div className="control-group">
            <span className="control-label">Universe</span>
            <div className="segment-group">
              {instrumentFilters.map((filter) => (
                <button
                  key={filter}
                  className={`segment-button ${instrumentType === filter ? "active" : ""}`}
                  onClick={() => setInstrumentType(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">Expiry</span>
            <div className="segment-group">
              {expiryFilters.map((filter) => (
                <button
                  key={filter}
                  className={`segment-button ${expiryType === filter ? "active" : ""}`}
                  onClick={() => setExpiryType(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">History window</span>
            <div className="segment-group">
              {analysisFilters.map((filter) => (
                <button
                  key={filter}
                  className={`segment-button ${analysisPeriod === filter ? "active" : ""}`}
                  onClick={() => setAnalysisPeriod(filter)}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">Rank by</span>
            <select
              className="toolbar-select"
              value={optimizationMode}
              onChange={(event) => setOptimizationMode(event.target.value as ModeFilter)}
            >
              {modeFilters.map((mode) => (
                <option key={mode} value={mode}>
                  {humanizeMode(mode)}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <span className="control-label">Sort</span>
            <select
              className="toolbar-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortFilter)}
            >
              <option value="projection_score">Projection score</option>
              <option value="combined_probability">Probability</option>
              <option value="expected_value_pct">Expected value %</option>
              <option value="sharpe_ratio">Sharpe ratio</option>
              <option value="trade_count">Trade count</option>
            </select>
          </div>

          <div className="control-group control-search">
            <span className="control-label">Search</span>
            <label className="search-shell">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Symbol"
              />
            </label>
          </div>
        </section>

        <section className="note-banner">
          Percentages come from stored optimization outputs. Strikes are recalculated from the
          latest spot snapshot so users can quickly translate history-backed CE and PE ranges into
          current levels.
        </section>

        <section className="glass-card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
          <div className="section-heading">
            <div>
              <h2>
                <Radar size={18} />
                Live projection table
              </h2>
              <p>Rows are ranked from the filtered database response, not hardcoded UI data</p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    "Symbol",
                    "Spot",
                    "CE setup",
                    "PE setup",
                    "Range",
                    "Probability",
                    "Expected value",
                    "Sharpe",
                    "Trades",
                    "Score",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, index) => (
                    <tr key={index}>
                      {Array.from({ length: 10 }).map((__, cellIndex) => (
                        <td key={cellIndex}>
                          <div className="skeleton" style={{ height: 16, width: "72%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="empty-state-cell">
                      No projections matched the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <ProjectionRowView key={`${row.symbol}-${row.expiry_type}`} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function ProjectionRowView({ row }: { row: ProjectionRow }) {
  return (
    <tr>
      <td>
        <div className="table-symbol">
          <strong>{row.symbol}</strong>
          <span>{row.instrument_type}</span>
        </div>
      </td>
      <td className="mono">
        <div className="table-symbol">
          <strong>{formatPrice(row.spot_price)}</strong>
          <span>{row.spot_date ?? "--"}</span>
        </div>
      </td>
      <td>
        <div className="table-symbol">
          <strong className="danger-text">
            <TrendingUp size={12} /> +{row.recommended_ce_pct ?? "--"}%
          </strong>
          <span>{formatPrice(row.recommended_ce_strike)}</span>
        </div>
      </td>
      <td>
        <div className="table-symbol">
          <strong className="success-text">
            <TrendingDown size={12} /> -{row.recommended_pe_pct ?? "--"}%
          </strong>
          <span>{formatPrice(row.recommended_pe_strike)}</span>
        </div>
      </td>
      <td className="mono">
        {formatPrice(row.recommended_pe_strike)} to {formatPrice(row.recommended_ce_strike)}
      </td>
      <td className="mono">{formatRatio(row.combined_probability)}</td>
      <td>
        <div className="table-symbol">
          <strong>{formatPrice(row.expected_value)}</strong>
          <span>{formatPct(row.expected_value_pct)}</span>
        </div>
      </td>
      <td className="mono">{row.sharpe_ratio?.toFixed(2) ?? "--"}</td>
      <td>
        <div className="table-symbol">
          <strong>{row.trade_count}</strong>
          <span>{row.last_expiry ?? "No expiry"}</span>
        </div>
      </td>
      <td>
        <div className="score-pill">{row.projection_score?.toFixed(1) ?? "--"}</div>
      </td>
    </tr>
  );
}

function MetricTile({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  note: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon-shell">{icon}</div>
      <div className="metric-label" style={{ marginTop: "1rem" }}>
        {label}
      </div>
      <div className="metric-value" style={{ fontSize: "1.5rem" }}>
        {value}
      </div>
      <div className="metric-note">{note}</div>
    </div>
  );
}

function humanizeMode(mode: ModeFilter) {
  return {
    expected_value: "Expected value",
    win_rate: "Win rate",
    sharpe_ratio: "Sharpe ratio",
    min_drawdown: "Min drawdown",
  }[mode];
}

function humanizeAnalysis(analysis: AnalysisFilter) {
  return {
    "3m": "3 month history",
    "6m": "6 month history",
    "1y": "1 year history",
    "2y": "2 year history",
    all: "Full history",
  }[analysis];
}

function formatPrice(value: number | null) {
  return value !== null ? `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "--";
}

function formatPct(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value.toFixed(2)}%` : "--";
}

function formatRatio(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${(value * 100).toFixed(1)}%` : "--";
}

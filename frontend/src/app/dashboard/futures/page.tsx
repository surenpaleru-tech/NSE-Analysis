"use client";

import { useEffect, useState } from "react";
import {
  CandlestickChart,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Waves,
} from "lucide-react";

import {
  fetchFuturesOutlook,
  type FuturesOutlookResponse,
  type FuturesOutlookRow,
} from "@/lib/api";

type InstrumentFilter = "all" | "index" | "stock";
type HorizonFilter = 1 | 2 | 3;
type LookbackFilter = 6 | 12 | 24;
type SortFilter = "signal_score" | "win_rate" | "avg_move_pct";

const instrumentFilters: InstrumentFilter[] = ["all", "index", "stock"];
const horizonFilters: HorizonFilter[] = [1, 2, 3];
const lookbackFilters: LookbackFilter[] = [6, 12, 24];

export default function FuturesOutlookPage() {
  const [instrumentType, setInstrumentType] = useState<InstrumentFilter>("all");
  const [horizonMonths, setHorizonMonths] = useState<HorizonFilter>(2);
  const [lookbackMonths, setLookbackMonths] = useState<LookbackFilter>(12);
  const [sortBy, setSortBy] = useState<SortFilter>("signal_score");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<FuturesOutlookResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadOutlook() {
      setLoading(true);
      try {
        const response = await fetchFuturesOutlook({
          instrumentType: instrumentType === "all" ? undefined : instrumentType,
          horizonMonths,
          lookbackMonths,
          sortBy,
          search: search || undefined,
          limit: 200,
        });

        if (!cancelled) {
          setData(response);
        }
      } catch (error) {
        console.error("Failed to load futures outlook:", error);
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadOutlook();
    return () => {
      cancelled = true;
    };
  }, [instrumentType, horizonMonths, lookbackMonths, sortBy, search]);

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Futures Outlook</h1>
        <p className="page-subtitle">
          Directional planning for the next one to three months using stored spot-price history
        </p>
      </div>

      <div className="page-body">
        <section className="hero-panel animate-fade-in">
          <div className="hero-copy">
            <span className="hero-eyebrow">Directional proxy</span>
            <h2>
              The current pipeline does not store a dedicated futures chain yet, so this workspace
              turns underlying spot history into a futures-friendly directional map.
            </h2>
            <p>
              Use it to shortlist long, short, or wait setups before we wire the pipeline for full
              futures-specific analytics.
            </p>
          </div>
          <div className="hero-stat-strip">
            <div>
              <span>Bullish</span>
              <strong>{summary?.bullish ?? 0}</strong>
            </div>
            <div>
              <span>Bearish</span>
              <strong>{summary?.bearish ?? 0}</strong>
            </div>
            <div>
              <span>Neutral</span>
              <strong>{summary?.neutral ?? 0}</strong>
            </div>
          </div>
        </section>

        <div className="grid-metrics" style={{ marginTop: "1.5rem" }}>
          <MetricTile
            label="Best signal"
            value={summary?.best_symbol ?? "--"}
            icon={<CandlestickChart size={18} />}
            note={summary?.best_score !== null && summary?.best_score !== undefined ? `Score ${summary.best_score}` : "Awaiting data"}
          />
          <MetricTile
            label="Horizon"
            value={`${horizonMonths} month${horizonMonths > 1 ? "s" : ""}`}
            icon={<Waves size={18} />}
            note="Forward return window"
          />
          <MetricTile
            label="Lookback"
            value={`${lookbackMonths} months`}
            icon={<Shield size={18} />}
            note={summary?.spot_date ?? "No snapshot date"}
          />
          <MetricTile
            label="Method"
            value="Spot proxy"
            icon={<TrendingUp size={18} />}
            note={data?.methodology ?? "Not loaded"}
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
            <span className="control-label">Horizon</span>
            <div className="segment-group">
              {horizonFilters.map((filter) => (
                <button
                  key={filter}
                  className={`segment-button ${horizonMonths === filter ? "active" : ""}`}
                  onClick={() => setHorizonMonths(filter)}
                  type="button"
                >
                  {filter}m
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">Lookback</span>
            <div className="segment-group">
              {lookbackFilters.map((filter) => (
                <button
                  key={filter}
                  className={`segment-button ${lookbackMonths === filter ? "active" : ""}`}
                  onClick={() => setLookbackMonths(filter)}
                  type="button"
                >
                  {filter}m
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <span className="control-label">Sort</span>
            <select
              className="toolbar-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortFilter)}
            >
              <option value="signal_score">Signal score</option>
              <option value="win_rate">Win-rate edge</option>
              <option value="avg_move_pct">Average move</option>
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
          Futures outlook currently uses the database&apos;s spot history as a directional proxy.
          Once the pipeline begins storing futures chains, this page can be upgraded to true
          contract-level analytics without changing the user workflow.
        </section>

        <section className="glass-card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
          <div className="section-heading">
            <div>
              <h2>
                <CandlestickChart size={18} />
                Directional board
              </h2>
              <p>Signal, target, and scenario prices for the selected horizon</p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  {[
                    "Symbol",
                    "Spot",
                    "Bias",
                    "Target",
                    "Upside case",
                    "Downside case",
                    "Win rate",
                    "Average move",
                    "Volatility",
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
                      No futures outlook rows matched the current filters.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => <FuturesRowView key={row.symbol} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

function FuturesRowView({ row }: { row: FuturesOutlookRow }) {
  const biasClass =
    row.bias === "bullish" ? "badge-success" : row.bias === "bearish" ? "badge-danger" : "badge-warning";

  return (
    <tr>
      <td>
        <div className="table-symbol">
          <strong>{row.symbol}</strong>
          <span>{row.instrument_type}</span>
        </div>
      </td>
      <td>
        <div className="table-symbol mono">
          <strong>{formatPrice(row.spot_price)}</strong>
          <span>{row.spot_date ?? "--"}</span>
        </div>
      </td>
      <td>
        <div className="table-symbol">
          <span className={`badge ${biasClass}`}>{row.setup}</span>
          <span>{row.bias}</span>
        </div>
      </td>
      <td className="mono">{formatPrice(row.target_price)}</td>
      <td>
        <div className="table-symbol mono">
          <strong className="success-text">{formatPrice(row.upside_case_price)}</strong>
          <span>{formatPct(row.upside_case_pct)}</span>
        </div>
      </td>
      <td>
        <div className="table-symbol mono">
          <strong className="danger-text">{formatPrice(row.downside_case_price)}</strong>
          <span>{formatPct(row.downside_case_pct)}</span>
        </div>
      </td>
      <td className="mono">{formatRatio(row.win_rate)}</td>
      <td>
        <div className="table-symbol">
          <strong>{formatPct(row.avg_move_pct)}</strong>
          <span>{formatPct(row.median_move_pct)} median</span>
        </div>
      </td>
      <td className="mono">{formatPct(row.volatility_pct)}</td>
      <td>
        <div className="score-pill">{row.signal_score?.toFixed(1) ?? "--"}</div>
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

function formatPrice(value: number | null) {
  return value !== null ? `Rs ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "--";
}

function formatPct(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${value.toFixed(2)}%` : "--";
}

function formatRatio(value: number | null | undefined) {
  return value !== null && value !== undefined ? `${(value * 100).toFixed(1)}%` : "--";
}

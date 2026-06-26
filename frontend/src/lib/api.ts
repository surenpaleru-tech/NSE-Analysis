/**
 * API Client — communicates with the FastAPI backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// =============================================================================
// Dashboard API
// =============================================================================

export async function fetchOverview() {
  return apiFetch<{
    latest_vix: number | null;
    vix_date: string | null;
    symbols_tracked: number;
    latest_recommendations: number;
    latest_date: string | null;
  }>("/api/v1/dashboard/overview");
}

export async function fetchWeeklyIndex(limit = 20) {
  return apiFetch<Recommendation[]>("/api/v1/dashboard/weekly-index", {
    params: { limit },
  });
}

export async function fetchMonthlyIndex(limit = 20) {
  return apiFetch<Recommendation[]>("/api/v1/dashboard/monthly-index", {
    params: { limit },
  });
}

export async function fetchStockRecommendations(sortBy = "expected_return", limit = 50) {
  return apiFetch<RankedRecommendation[]>("/api/v1/dashboard/stocks", {
    params: { sort_by: sortBy, limit },
  });
}

// =============================================================================
// Recommendations API
// =============================================================================

export async function fetchTodayRecommendations(
  instrumentType?: string,
  expiryType?: string
) {
  return apiFetch<{
    date: string | null;
    count: number;
    recommendations: Recommendation[];
  }>("/api/v1/recommendations/today", {
    params: { instrument_type: instrumentType, expiry_type: expiryType },
  });
}

export async function fetchSymbolRecommendation(
  symbol: string,
  expiryType?: string,
  days = 30
) {
  return apiFetch<{
    symbol: string;
    count: number;
    history: Recommendation[];
  }>(`/api/v1/recommendations/${symbol}`, {
    params: { expiry_type: expiryType, days },
  });
}

// =============================================================================
// Analytics API
// =============================================================================

export async function fetchHeatmap(
  symbol: string,
  expiryType = "monthly",
  metric = "expected_value"
) {
  return apiFetch<{
    symbol: string;
    expiry_type: string;
    metric: string;
    data: HeatmapCell[];
  }>(`/api/v1/analytics/heatmap/${symbol}`, {
    params: { expiry_type: expiryType, metric },
  });
}

export async function fetchStrategyHistory(
  symbol: string,
  expiryType = "monthly",
  cePct?: number,
  pePct?: number
) {
  return apiFetch<{
    symbol: string;
    results: StrategyResult[];
  }>(`/api/v1/analytics/history/${symbol}`, {
    params: { expiry_type: expiryType, ce_pct: cePct, pe_pct: pePct },
  });
}

export async function fetchRegimeAnalysis(symbol: string, expiryType = "monthly") {
  return apiFetch<{
    symbol: string;
    regimes: Record<string, RegimeData>;
  }>(`/api/v1/analytics/regimes/${symbol}`, {
    params: { expiry_type: expiryType },
  });
}

export async function fetchComparison(symbols: string, expiryType = "monthly") {
  return apiFetch<{
    expiry_type: string;
    comparison: ComparisonItem[];
  }>("/api/v1/analytics/compare", {
    params: { symbols, expiry_type: expiryType },
  });
}

// =============================================================================
// Scanner API
// =============================================================================

export async function fetchOpportunities(sortBy = "expected_return", limit = 20) {
  return apiFetch<{
    date: string;
    opportunities: Opportunity[];
  }>("/api/v1/scanner/opportunities", {
    params: { sort_by: sortBy, limit },
  });
}

// =============================================================================
// Alerts API
// =============================================================================

export async function fetchAlerts(isSent?: boolean, symbol?: string, limit = 50) {
  return apiFetch<{
    count: number;
    alerts: {
      id: number;
      symbol: string;
      alert_type: string;
      title: string;
      message: string;
      channel: string;
      is_sent: boolean;
      created_at: string;
    }[];
  }>("/api/v1/alerts", {
    params: { is_sent: isSent, symbol, limit },
  });
}

// =============================================================================
// Chat API
// =============================================================================

export async function sendChatMessage(message: string, sessionId?: string) {
  return apiFetch<{
    session_id: string;
    response: string;
    sql_query: string | null;
    sources: string[];
  }>("/api/v1/chat/message", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });
}

// =============================================================================
// Types
// =============================================================================

export interface Recommendation {
  date?: string;
  symbol: string;
  instrument_type?: string;
  expiry_type?: string;
  spot_price: number | null;
  recommended_ce_pct: number | null;
  recommended_pe_pct: number | null;
  recommended_ce_strike: number | null;
  recommended_pe_strike: number | null;
  ce_probability?: number | null;
  pe_probability?: number | null;
  combined_probability: number | null;
  expected_return: number | null;
  risk_score: number | null;
  market_regime?: string | null;
}

export interface RankedRecommendation extends Recommendation {
  rank: number;
}

export interface HeatmapCell {
  ce_pct: number | null;
  pe_pct: number | null;
  value: number | null;
  analysis_period: string;
}

export interface StrategyResult {
  expiry: string;
  ce_pct: number;
  pe_pct: number;
  total_pnl: number | null;
  return_pct: number | null;
  ce_expired_worthless: boolean | null;
  pe_expired_worthless: boolean | null;
  market_regime: string | null;
}

export interface RegimeData {
  vix_regime: string | null;
  market_regime: string | null;
  recommended_ce_pct: number | null;
  recommended_pe_pct: number | null;
  combined_win_rate: number | null;
  expected_value: number | null;
  sharpe_ratio: number | null;
  sortino_ratio?: number | null;
  calmar_ratio?: number | null;
  max_drawdown: number | null;
  kelly_criterion?: number | null;
}

export interface ComparisonItem {
  symbol: string;
  instrument_type: string;
  recommended_ce_pct: number | null;
  recommended_pe_pct: number | null;
  combined_win_rate: number | null;
  expected_value: number | null;
  sharpe_ratio: number | null;
  sortino_ratio?: number | null;
  calmar_ratio?: number | null;
  max_drawdown: number | null;
  kelly_criterion?: number | null;
}

export interface Opportunity {
  rank: number;
  symbol: string;
  instrument_type: string;
  expiry_type: string;
  spot_price: number | null;
  recommended_ce_pct: number | null;
  recommended_pe_pct: number | null;
  combined_probability: number | null;
  expected_return: number | null;
  risk_score: number | null;
  market_regime: string | null;
}

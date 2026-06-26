"use client";

import { useState, useEffect } from "react";
import { Bell, Check, X, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { fetchAlerts } from "../../lib/api";

interface AlertItem {
  id: number;
  symbol: string;
  type: string;
  title: string;
  message: string;
  channel: string;
  is_sent: boolean;
  created_at: string;
}

const typeColors: Record<string, string> = {
  recommendation: "badge-info",
  high_iv: "badge-warning",
  vix_spike: "badge-danger",
  expiry_alert: "badge-success",
};

const typeIcons: Record<string, React.ReactNode> = {
  recommendation: <TrendingUp size={14} />,
  high_iv: <AlertTriangle size={14} />,
  vix_spike: <AlertTriangle size={14} />,
  expiry_alert: <Bell size={14} />,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "sent" | "pending">("all");

  useEffect(() => {
    async function loadAlerts() {
      try {
        setLoading(true);
        const res = await fetchAlerts();
        if (res && res.alerts) {
          const mapped: AlertItem[] = res.alerts.map(a => ({
            id: a.id,
            symbol: a.symbol,
            type: a.alert_type,
            title: a.title || "Alert",
            message: a.message || "",
            channel: a.channel || "in_app",
            is_sent: a.is_sent,
            created_at: a.created_at,
          }));
          setAlerts(mapped);
        }
      } catch (err) {
        console.error("Failed to load alerts:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  const filtered = alerts.filter(a => {
    if (filter === "sent") return a.is_sent;
    if (filter === "pending") return !a.is_sent;
    return true;
  });

  const markRead = (id: number) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_sent: true } : a));
  };

  const dismiss = (id: number) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const unreadCount = alerts.filter(a => !a.is_sent).length;

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 className="page-title">
              <Bell size={22} style={{ display: "inline", marginRight: 10, color: "var(--accent-amber)" }} />
              Alerts & Notifications
              {unreadCount > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: 12, fontSize: "0.7rem", verticalAlign: "middle" }}>
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="page-subtitle">Real-time alerts for recommendations, VIX spikes, and market events</p>
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
          {(["all", "sent", "pending"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? "btn btn-primary" : "btn btn-ghost"}
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.85rem", textTransform: "capitalize" }}
            >
              {f === "pending" ? "Unread" : f === "sent" ? "Read" : "All"} {f === "all" ? `(${alerts.length})` : f === "sent" ? `(${alerts.filter(a => a.is_sent).length})` : `(${alerts.filter(a => !a.is_sent).length})`}
            </button>
          ))}
        </div>

        {/* Alert Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="glass-card"
                style={{ padding: "1.25rem 1.5rem" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <div className="skeleton" style={{ height: 20, width: 100 }} />
                    <div className="skeleton" style={{ height: 20, width: 60 }} />
                    <div className="skeleton" style={{ height: 16, width: 80 }} />
                  </div>
                  <div className="skeleton" style={{ height: 22, width: "60%" }} />
                  <div className="skeleton" style={{ height: 16, width: "90%" }} />
                  <div className="skeleton" style={{ height: 14, width: 120 }} />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No alerts in this category</p>
            </div>
          ) : (
            filtered.map(alert => (
              <div
                key={alert.id}
                className="glass-card animate-fade-in"
                style={{
                  padding: "1.25rem 1.5rem",
                  opacity: alert.is_sent ? 0.7 : 1,
                  borderLeft: `3px solid ${!alert.is_sent ? "var(--accent-amber)" : "transparent"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
                      <span className={`badge ${typeColors[alert.type] || "badge-info"}`} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {typeIcons[alert.type]}
                        {alert.type.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontWeight: 700, color: "var(--accent-blue)", fontSize: "0.875rem" }}>{alert.symbol}</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        via {alert.channel}
                      </span>
                      {!alert.is_sent && (
                        <span className="badge badge-warning" style={{ fontSize: "0.65rem" }}>UNREAD</span>
                      )}
                    </div>
                    <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.375rem" }}>
                      {alert.title}
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {alert.message}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                      {new Date(alert.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", marginLeft: "1rem" }}>
                    {!alert.is_sent && (
                      <button
                        onClick={() => markRead(alert.id)}
                        title="Mark as read"
                        style={{ padding: 8, background: "var(--accent-emerald-glow)", border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--accent-emerald)" }}
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => dismiss(alert.id)}
                      title="Dismiss"
                      style={{ padding: 8, background: "var(--bg-tertiary)", border: "1px solid var(--border-primary)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-muted)" }}
                    >
                      <X size={16} />
                    </button>
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

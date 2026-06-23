"use client";

import Link from "next/link";
import { Zap, ArrowRight, BarChart3, Shield, MessageSquare, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
      {/* Hero Section */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.5rem 3rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={22} color="white" />
          </div>
          <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>
            NSE Options Intelligence
          </span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/auth/login" className="btn btn-ghost">
            Sign In
          </Link>
          <Link href="/dashboard" className="btn btn-primary">
            Dashboard
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <section
        style={{
          textAlign: "center",
          padding: "6rem 2rem 4rem",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          className="badge badge-info animate-fade-in"
          style={{ marginBottom: "1.5rem", fontSize: "0.8rem", padding: "0.35rem 1rem" }}
        >
          AI-Powered Options Analytics
        </div>
        <h1
          className="animate-fade-in"
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "1.5rem",
            background: "linear-gradient(135deg, #f1f5f9 30%, #60a5fa 70%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Find the Optimal CE/PE
          <br />
          Selling Bands for NSE
        </h1>
        <p
          className="animate-fade-in"
          style={{
            fontSize: "1.15rem",
            color: "var(--text-secondary)",
            maxWidth: 650,
            margin: "0 auto 2.5rem",
            lineHeight: 1.7,
          }}
        >
          Statistically identify the best upside and downside percentages for
          selling Call and Put options on NIFTY, BANKNIFTY, and 190+ F&O stocks.
          Powered by historical analytics, ML predictions, and market regime analysis.
        </p>
        <div
          className="animate-fade-in"
          style={{ display: "flex", gap: 16, justifyContent: "center" }}
        >
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}>
            <Zap size={18} />
            Launch Dashboard
          </Link>
          <Link href="/chat" className="btn btn-ghost" style={{ padding: "0.875rem 2rem", fontSize: "1rem" }}>
            <MessageSquare size={18} />
            Ask AI
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section
        style={{
          padding: "4rem 3rem",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        <div className="grid-3col">
          <FeatureCard
            icon={<BarChart3 size={24} />}
            title="169 CE/PE Combinations"
            description="Evaluates every combination of OTM percentages from 1% to 20% across all historical expiries."
            color="var(--accent-blue)"
          />
          <FeatureCard
            icon={<Shield size={24} />}
            title="Risk-Adjusted Metrics"
            description="Sharpe, Sortino, Calmar ratios, maximum drawdown, Kelly criterion, and probability analysis."
            color="var(--accent-emerald)"
          />
          <FeatureCard
            icon={<TrendingUp size={24} />}
            title="Market Regime Aware"
            description="Separate recommendations for bull, bear, sideways markets and low, medium, high VIX environments."
            color="var(--accent-purple)"
          />
        </div>
      </section>

      {/* Example Output */}
      <section
        style={{
          padding: "2rem 3rem 6rem",
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <div
          className="glass-card"
          style={{ padding: "2rem", textAlign: "center" }}
        >
          <div className="metric-label" style={{ marginBottom: "1rem" }}>
            Example: NIFTY Monthly
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "1.5rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                Recommended CE
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-red)" }}>
                +6%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                Recommended PE
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                −5%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                Win Rate
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-blue)" }}>
                84%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 4 }}>
                Exp. Return
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--accent-emerald)" }}>
                2.8%
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="glass-card animate-fade-in"
      style={{ padding: "2rem" }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "var(--radius-md)",
          background: `${color}15`,
          color: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: "1.05rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {description}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Settings, Server, Brain, Bell, Database, Save, Eye, EyeOff } from "lucide-react";

export default function SettingsPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState({
    llmProvider: "ollama",
    ollamaModel: "llama3.1",
    openaiKey: "",
    ingestionCron: "0 18 * * 1-5",
    vixLow: "15",
    vixHigh: "25",
    otmMin: "1",
    otmMax: "20",
    telegramToken: "",
    telegramChatId: "",
    analysisDefault: "1y",
    optimizationMode: "expected_value",
  });

  const update = (k: keyof typeof config, v: string) => setConfig(prev => ({ ...prev, [k]: v }));

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">
          <Settings size={22} style={{ display: "inline", marginRight: 10, color: "var(--text-muted)" }} />
          Settings
        </h1>
        <p className="page-subtitle">Configure data ingestion, AI models, notifications, and analytics parameters</p>
      </div>

      <div className="page-body" style={{ maxWidth: 800 }}>

        {/* LLM Configuration */}
        <SettingSection icon={<Brain size={18} />} title="AI / LLM Configuration">
          <SettingRow label="LLM Provider" description="Choose local Ollama or cloud OpenAI">
            <select value={config.llmProvider} onChange={e => update("llmProvider", e.target.value)} className="setting-select">
              <option value="ollama">Ollama (Local — Free)</option>
              <option value="openai">OpenAI (Cloud)</option>
            </select>
          </SettingRow>
          {config.llmProvider === "ollama" ? (
            <SettingRow label="Ollama Model" description="Model must be pulled via `ollama pull <name>`">
              <select value={config.ollamaModel} onChange={e => update("ollamaModel", e.target.value)} className="setting-select">
                <option value="llama3.1">llama3.1 (Recommended)</option>
                <option value="llama3.2">llama3.2</option>
                <option value="mistral">mistral</option>
                <option value="phi3">phi3 (Lightweight)</option>
              </select>
            </SettingRow>
          ) : (
            <SettingRow label="OpenAI API Key" description="Your OpenAI API key for GPT-4">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showPwd ? "text" : "password"}
                  value={config.openaiKey}
                  onChange={e => update("openaiKey", e.target.value)}
                  placeholder="sk-..."
                  className="setting-input"
                  style={{ flex: 1 }}
                />
                <button onClick={() => setShowPwd(!showPwd)} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </SettingRow>
          )}
          <SettingRow label="Default Analysis Period" description="Period for band optimization calculations">
            <select value={config.analysisDefault} onChange={e => update("analysisDefault", e.target.value)} className="setting-select">
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="1y">1 Year (Recommended)</option>
              <option value="2y">2 Years</option>
              <option value="all">All Time</option>
            </select>
          </SettingRow>
          <SettingRow label="Optimization Mode" description="Metric used to rank CE/PE combinations">
            <select value={config.optimizationMode} onChange={e => update("optimizationMode", e.target.value)} className="setting-select">
              <option value="expected_value">Expected Value (Recommended)</option>
              <option value="win_rate">Win Rate</option>
              <option value="sharpe_ratio">Sharpe Ratio</option>
              <option value="min_drawdown">Minimum Drawdown</option>
            </select>
          </SettingRow>
        </SettingSection>

        {/* Data Ingestion */}
        <SettingSection icon={<Database size={18} />} title="Data Ingestion">
          <SettingRow label="Ingestion Schedule (Cron)" description="When to download daily NSE bhavcopy (IST)">
            <input type="text" value={config.ingestionCron} onChange={e => update("ingestionCron", e.target.value)} className="setting-input" placeholder="0 18 * * 1-5" style={{ fontFamily: "var(--font-mono)" }} />
          </SettingRow>
          <div style={{ padding: "0.75rem 1rem", background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
            📅 Current schedule: <strong style={{ color: "var(--text-secondary)" }}>Weekdays at 6:00 PM IST</strong> (after market close at 3:30 PM + settlement time)
          </div>
        </SettingSection>

        {/* Analytics Thresholds */}
        <SettingSection icon={<Server size={18} />} title="Analytics Thresholds">
          <SettingRow label="VIX Low Threshold" description="Below this = Low VIX regime">
            <input type="number" value={config.vixLow} onChange={e => update("vixLow", e.target.value)} className="setting-input" style={{ width: 120 }} />
          </SettingRow>
          <SettingRow label="VIX High Threshold" description="Above this = High VIX regime">
            <input type="number" value={config.vixHigh} onChange={e => update("vixHigh", e.target.value)} className="setting-input" style={{ width: 120 }} />
          </SettingRow>
          <SettingRow label="OTM Range" description="Min and max OTM % to analyze">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="number" value={config.otmMin} onChange={e => update("otmMin", e.target.value)} className="setting-input" style={{ width: 80 }} />
              <span style={{ color: "var(--text-muted)" }}>to</span>
              <input type="number" value={config.otmMax} onChange={e => update("otmMax", e.target.value)} className="setting-input" style={{ width: 80 }} />
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>%</span>
            </div>
          </SettingRow>
        </SettingSection>

        {/* Notifications */}
        <SettingSection icon={<Bell size={18} />} title="Notifications">
          <SettingRow label="Telegram Bot Token" description="Get from @BotFather on Telegram">
            <div style={{ display: "flex", gap: 8 }}>
              <input type={showPwd ? "text" : "password"} value={config.telegramToken} onChange={e => update("telegramToken", e.target.value)} className="setting-input" style={{ flex: 1 }} placeholder="1234567890:ABC..." />
              <button onClick={() => setShowPwd(!showPwd)} className="btn btn-ghost" style={{ padding: "0.5rem" }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </SettingRow>
          <SettingRow label="Telegram Chat ID" description="Your Telegram user or group ID">
            <input type="text" value={config.telegramChatId} onChange={e => update("telegramChatId", e.target.value)} className="setting-input" placeholder="-100123456789" />
          </SettingRow>
        </SettingSection>

        {/* Save */}
        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} className="btn btn-primary" style={{ padding: "0.75rem 2rem", fontSize: "0.95rem" }}>
            <Save size={16} />
            {saved ? "Saved! ✓" : "Save Settings"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .setting-select, .setting-input {
          padding: 0.5rem 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: var(--font-sans);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 150ms;
          width: 100%;
          max-width: 300px;
        }
        .setting-select:focus, .setting-input:focus {
          border-color: var(--accent-blue);
        }
      `}</style>
    </>
  );
}

function SettingSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "1.25rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border-glass)" }}>
        <span style={{ color: "var(--accent-blue)" }}>{icon}</span>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>{children}</div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "2rem" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Code, Sparkles, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql_query?: string | null;
  sources?: string[];
  timestamp: Date;
}

const SUGGESTED_QUESTIONS = [
  "What is the optimal CE% for NIFTY weekly expiries historically?",
  "Which stocks have the highest win rate for selling options?",
  "Show BANKNIFTY performance in high VIX periods",
  "What PE% had the maximum probability of expiring worthless for NIFTY?",
  "Compare Sharpe ratios for NIFTY vs BANKNIFTY monthly strategy",
  "Which symbols give the best risk-adjusted returns for option selling?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your NSE Options Intelligence assistant. I can answer questions about optimal CE/PE selling bands, historical performance, risk metrics, and market conditions.\n\nTry asking something like: *\"What is the best OTM percentage to sell NIFTY options?\"*",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [showSql, setShowSql] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const question = text || input.trim();
    if (!question || loading) return;

    setInput("");
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, session_id: sessionId }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      if (data.session_id && !sessionId) setSessionId(data.session_id);

      const botMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        sql_query: data.sql_query,
        sources: data.sources,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ Unable to reach the AI backend. Please ensure the server is running and Ollama is configured. The backend API is at `http://localhost:8000`.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">
            <Sparkles size={22} style={{ display: "inline", marginRight: 10, color: "var(--accent-purple)" }} />
            AI Options Assistant
          </h1>
          <p className="page-subtitle">Ask anything about NSE options analytics, optimal bands, and market data</p>
        </div>
        <Link href="/dashboard" className="btn btn-ghost" style={{ fontSize: "0.8rem" }}>
          ← Dashboard
        </Link>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar — Suggested Questions */}
        <div
          style={{
            width: 280, borderRight: "1px solid var(--border-primary)",
            padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
            Suggested Questions
          </div>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={loading}
              style={{
                display: "flex", alignItems: "flex-start", gap: 8, padding: "0.75rem",
                background: "var(--bg-tertiary)", border: "1px solid var(--border-glass)",
                borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left",
                color: "var(--text-secondary)", fontSize: "0.8rem", lineHeight: 1.5,
                transition: "all 150ms",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = "var(--border-accent)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "var(--border-glass)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <ChevronRight size={14} style={{ marginTop: 2, flexShrink: 0, color: "var(--accent-blue)" }} />
              {q}
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Messages */}
          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className="animate-fade-in">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    background: msg.role === "user" ? "var(--accent-blue)" : "var(--gradient-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {msg.role === "user" ? <User size={16} color="white" /> : <Bot size={16} color="white" />}
                  </div>

                  {/* Bubble */}
                  <div style={{ maxWidth: "70%" }}>
                    <div
                      className={`chat-bubble ${msg.role}`}
                      style={{ whiteSpace: "pre-wrap" }}
                      dangerouslySetInnerHTML={{
                        __html: msg.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/`(.*?)`/g, `<code style="background:var(--bg-tertiary);padding:2px 6px;border-radius:4px;font-family:var(--font-mono);font-size:0.85em">$1</code>`),
                      }}
                    />

                    {/* SQL Query Expander */}
                    {msg.sql_query && (
                      <div style={{ marginTop: 8 }}>
                        <button
                          onClick={() => setShowSql(showSql === msg.id ? null : msg.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 6,
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--accent-blue)", fontSize: "0.75rem", fontWeight: 500,
                          }}
                        >
                          <Code size={12} />
                          {showSql === msg.id ? "Hide" : "Show"} SQL Query
                        </button>
                        {showSql === msg.id && (
                          <pre style={{
                            marginTop: 8, padding: "0.75rem",
                            background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)",
                            border: "1px solid var(--border-glass)",
                            fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                            color: "var(--accent-cyan)", overflowX: "auto",
                          }}>
                            {msg.sql_query}
                          </pre>
                        )}
                      </div>
                    )}

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {msg.sources.map((s, i) => (
                          <span key={i} className="badge badge-info" style={{ fontSize: "0.65rem" }}>{s}</span>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 4, textAlign: msg.role === "user" ? "right" : "left" }}>
                      {msg.timestamp.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bot size={16} color="white" />
                </div>
                <div className="chat-bubble assistant" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ color: "var(--text-muted)" }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="chat-input-area">
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <textarea
                className="chat-input"
                placeholder="Ask about optimal CE/PE bands, historical win rates, risk metrics..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ resize: "none", minHeight: 48, maxHeight: 120 }}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="btn btn-primary"
                style={{ height: 48, width: 48, padding: 0, flexShrink: 0 }}
              >
                {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
              </button>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 8 }}>
              Press <kbd style={{ padding: "1px 5px", background: "var(--bg-tertiary)", borderRadius: 3, border: "1px solid var(--border-primary)", fontSize: "0.7rem" }}>Enter</kbd> to send · <kbd style={{ padding: "1px 5px", background: "var(--bg-tertiary)", borderRadius: 3, border: "1px solid var(--border-primary)", fontSize: "0.7rem" }}>Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

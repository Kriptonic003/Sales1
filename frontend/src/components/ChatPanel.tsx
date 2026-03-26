import { useState, useRef, useEffect } from "react";
import { api, formatError } from "../api/client";
import type { ChatResponse, DashboardResponse } from "../api/types";

/* ── Predefined question chips ─────────────────────────────────── */
const PRESET_QUESTIONS = [
  // Dashboard
  "What is the current risk level and what does it mean?",
  "Summarize the overall product health right now.",
  "What actions should I take based on this dashboard?",
  // Comments
  "Why are there so many negative comments?",
  "What are customers complaining about most?",
  "How can we improve the positive sentiment?",
  // Report
  "Why is the predicted sales drop at this level?",
  "What is the loss probability and is it serious?",
  "What is the expected recovery timeline?",
  // Model
  "How does the sales prediction model work?",
  "How reliable is the sentiment analysis model?",
];

type Role = "user" | "assistant";
interface Message { role: Role; text: string; }

interface Props {
  /** Pass in the live dashboard data so the AI can answer about actual numbers */
  dashboardData?: DashboardResponse | null;
  /** Page context label shown in the header */
  pageLabel?: string;
}

export default function ChatPanel({ dashboardData, pageLabel = "Dashboard" }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "👋 Hi! I'm your AI Sales Copilot powered by Groq. Ask me anything about the current product's sentiment, risk, or sales performance — I can see your live dashboard data!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPresets, setShowPresets] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Build context dict from live dashboard data */
  const buildContext = (): Record<string, string | number> | undefined => {
    if (!dashboardData?.kpis) return undefined;
    const k = dashboardData.kpis;
    return {
      "Product Name": k.product_name,
      "Brand Name": k.brand_name,
      "Average Sentiment Score": k.average_sentiment.toFixed(3),
      "Negative Comments %": `${k.negative_percentage.toFixed(1)}%`,
      "Positive Comments %": `${(k.positive_percentage ?? 0).toFixed(1)}%`,
      "Neutral Comments %": `${(k.neutral_percentage ?? 0).toFixed(1)}%`,
      "Positive Count": k.positive_count ?? 0,
      "Negative Count": k.negative_count ?? 0,
      "Neutral Count": k.neutral_count ?? 0,
      "Predicted Sales Drop": `${k.predicted_sales_drop.toFixed(1)}%`,
      "Risk Level": k.risk_level,
      "Top Positives (Likes)": k.positives.join(", "),
      "Top Negatives (Hates)": k.negatives.join(", "),
      "Total Comments Analyzed":
        dashboardData.comment_volume?.reduce((s, c) => s + c.total_posts, 0) ?? 0,
    };
  };

  const sendMessage = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || loading) return;
    setInput("");
    setError("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const context = buildContext();
      const { data } = await api.post<ChatResponse>("/chat", {
        message: userMsg,
        context,
      });
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass neon-border rounded-2xl flex flex-col" style={{ maxHeight: "540px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-cyan-500/20">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="text-lg">🤖</span> AI Copilot
            <span className="text-xs font-normal text-cyan-400 bg-cyan-400/10 rounded-md px-2 py-0.5">
              Groq
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{pageLabel} — live data aware</p>
        </div>
        {dashboardData?.kpis && (
          <div className={`text-xs font-semibold px-2 py-1 rounded-lg ${dashboardData.kpis.risk_level === "High"
            ? "bg-red-500/20 text-red-300"
            : dashboardData.kpis.risk_level === "Medium"
              ? "bg-yellow-500/20 text-yellow-300"
              : "bg-green-500/20 text-green-300"
            }`}>
            {dashboardData.kpis.risk_level} Risk
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[180px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user"
                ? "bg-cyan-600/80 text-white rounded-br-none"
                : "bg-slate-800/80 text-slate-100 rounded-bl-none border border-cyan-500/15"
                }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800/80 border border-cyan-500/15 rounded-2xl rounded-bl-none px-4 py-2 text-sm text-slate-400 flex items-center gap-2">
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="text-xs text-rose-300 bg-rose-500/10 rounded-lg px-3 py-2">{error}</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Predefined question chips — collapsible */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setShowPresets(p => !p)}
          className="flex items-center gap-1.5 text-[10px] text-slate-400 uppercase tracking-wider mb-1.5 hover:text-cyan-300 transition-colors w-full text-left"
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: showPresets ? "rotate(0deg)" : "rotate(-90deg)" }}
          >
            ▾
          </span>
          Quick questions
        </button>
        <div
          className="flex flex-wrap gap-1.5 overflow-hidden transition-all duration-200"
          style={{ maxHeight: showPresets ? "200px" : "0px", opacity: showPresets ? 1 : 0 }}
        >
          {PRESET_QUESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-xs rounded-full border border-cyan-500/25 px-2.5 py-1 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400/50 transition-all disabled:opacity-40 truncate max-w-[140px]"
              title={q}
            >
              {q.length > 28 ? q.slice(0, 27) + "…" : q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-cyan-500/20">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about sentiment, risk, or next actions…"
            className="flex-1 rounded-xl border border-cyan-500/25 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400 placeholder:text-slate-500"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="btn-primary rounded-xl px-4 py-2 text-sm disabled:opacity-50 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

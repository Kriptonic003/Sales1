import { Link } from "react-router-dom";

const FEATURES = [
  {
    icon: "🎯",
    title: "Sentiment Analysis",
    desc: "Twitter-RoBERTa transformer classifies every YouTube comment as positive, negative, or neutral with a confidence score.",
  },
  {
    icon: "📉",
    title: "Sales Drop Prediction",
    desc: "Logistic regression + linear regression models convert sentiment signals into a risk level and % revenue drop estimate.",
  },
  {
    icon: "📂",
    title: "RAG Chatbot",
    desc: "Upload any file (PDF, CSV, XLSX, DOCX) and ask questions. TF-IDF retrieval finds the most relevant chunks, Groq answers with context.",
  },
  {
    icon: "🤖",
    title: "AI Copilot — Groq",
    desc: "Llama 3.1 (via Groq) answers any question about your dashboard, comments, report, or model using live KPI data.",
  },
  {
    icon: "📥",
    title: "Export to PDF",
    desc: "One-click branded PDF report — cover page, KPI bars, priority actions — ready to share with stakeholders.",
  },
  {
    icon: "💬",
    title: "Comment Explorer",
    desc: "Browse all analyzed comments with sentiment labels, scores, and date filters.",
  },
  {
    icon: "📊",
    title: "Live Dashboard",
    desc: "Real-time KPI cards, sentiment trend charts, distribution pie, and sales projection — all in one neon view.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="glass neon-border relative overflow-hidden rounded-3xl p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-700/10" />
        <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">
              AI Sentiment + Sales Intelligence
            </p>
            <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl leading-tight">
              Predict Sales Loss from YouTube — Before It Hits Revenue.
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              FORESIGHT fuses social sentiment, comment volume, and sales history to
              catch revenue drops early. Get risk scores, AI insights, and a one-click
              PDF report — all in one dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/analyze" className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold">
                Analyze Product
              </Link>
              <Link to="/dashboard" className="btn-ghost rounded-xl px-5 py-3 text-sm">
                View Dashboard
              </Link>
              <Link to="/report" className="btn-ghost rounded-xl px-5 py-3 text-sm">
                Sales Report
              </Link>
            </div>
          </div>

          {/* How it works card */}
          <div className="glass neon-border w-full max-w-sm rounded-2xl border border-cyan-500/25 p-5 space-y-4 shrink-0">
            <div className="text-sm font-semibold text-cyan-200">How it works</div>
            <ol className="space-y-3 text-slate-200 text-sm">
              {[
                "Enter your product + brand to pull YouTube comments.",
                "RoBERTa classifies every comment and builds daily sentiment signals.",
                "ML models predict sales risk level and % revenue drop.",
                "Ask the Groq AI Copilot questions — then export the PDF report.",
              ].map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-cyan-300 shrink-0">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
            <div className="rounded-xl bg-slate-900/70 border border-cyan-500/15 p-3 text-xs text-slate-300">
              <span className="text-cyan-400 font-semibold">New: </span>
              Groq AI Copilot with 12 predefined questions · Branded PDF export
            </div>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4 px-1">Platform Features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass neon-border rounded-2xl p-5 border border-cyan-500/15 hover:border-cyan-400/40 transition-colors space-y-2"
            >
              <div className="text-2xl">{f.icon}</div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

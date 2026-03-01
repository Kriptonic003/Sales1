const models = [
  {
    tag: "NLP",
    name: "Natural Language Processing",
    icon: "🧠",
    description:
      "The foundation of all text understanding in this app. Raw YouTube comments are pre-processed — tokenised, lowercased, and normalised — before being passed to any downstream model. NLP enables the system to interpret unstructured user language at scale.",
    details: ["Tokenisation & text cleaning", "Stop-word removal", "Comment batching for efficient inference"],
  },
  {
    tag: "Transformer",
    name: "Twitter-RoBERTa Sentiment Analysis",
    icon: "⚡",
    description:
      "A RoBERTa model fine-tuned on ~124M tweets by Cardiff NLP. Classifies each comment as POSITIVE, NEGATIVE, or NEUTRAL with a confidence score, then maps it to a continuous sentiment score from −1 (very negative) to +1 (very positive). Chosen for its strong performance on short, informal social-media text.",
    details: [
      "Model: cardiffnlp/twitter-roberta-base-sentiment-latest",
      "Trained on 124M tweets — ideal for YouTube comment language",
      "Native 3-class output: positive / negative / neutral",
      "Runs locally via Hugging Face Transformers + PyTorch",
    ],
  },
  {
    tag: "Classification",
    name: "Logistic Regression — Sales Risk",
    icon: "📊",
    description:
      "Trained on aggregated daily sentiment features to estimate the probability that a product will experience a sales drop. The output risk level (Low / Medium / High) is used to trigger alerts and shape the Sales Loss Report.",
    details: [
      "Features: rolling avg sentiment, negative %, comment volume",
      "Output: risk probability (0 – 1) → Low / Medium / High label",
      "Library: scikit-learn",
      "Retrains incrementally as new comments arrive",
    ],
  },
  {
    tag: "Regression",
    name: "Linear Regression — Revenue Drop %",
    icon: "📉",
    description:
      "Estimates the expected percentage drop in revenue based on sentiment trends. Works alongside the classifier to give a quantitative impact alongside the qualitative risk label.",
    details: [
      "Predicts % revenue drop from sentiment trajectory",
      "Uses same feature set as the classifier",
      "Library: scikit-learn",
      "Output ties directly into Sales Loss Report KPIs",
    ],
  },
  {
    tag: "Generative AI",
    name: "Gemini 1.5 Flash — AI Copilot",
    icon: "✨",
    description:
      "Google's Gemini 1.5 Flash is used as the conversational AI copilot. It is system-prompted to act as a sales analytics expert and answers user questions about sentiment trends, risk factors, and mitigation strategies in plain business language.",
    details: [
      "Model: gemini-1.5-flash via Google Generative Language API",
      "System-prompted for sales & sentiment domain expertise",
      "Stateless per request — no conversation history stored",
      "Fallback message shown when API key is not configured",
    ],
  },
  {
    tag: "Aggregation",
    name: "Daily Sentiment Aggregation",
    icon: "📅",
    description:
      "Not a model per se, but a critical analytical layer. Individual comment scores are rolled up by day to produce time-series features: average sentiment, negative share, and volume. This transforms sparse comment data into a structured signal for the ML models.",
    details: [
      "Groups by product + brand + date",
      "Computes: avg score, negative %, post count",
      "Powers the Dashboard time-series charts",
      "Stored in SQLite for fast retrieval",
    ],
  },
];

export default function ModelExplainPage() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass neon-border rounded-2xl p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">Under the Hood</p>
        <h2 className="text-2xl font-semibold text-white">Models & AI Techniques</h2>
        <p className="mt-2 text-slate-300 text-sm">
          This app combines classical ML, transformer-based NLP, and generative AI into a single pipeline
          that turns YouTube comments into actionable sales intelligence.
        </p>
      </div>

      {/* Model Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {models.map((m) => (
          <div
            key={m.name}
            className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5 space-y-3"
          >
            {/* Card Header */}
            <div className="flex items-start gap-3">
              <span className="text-2xl">{m.icon}</span>
              <div>
                <span className="inline-block rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300 mb-1">
                  {m.tag}
                </span>
                <h3 className="text-base font-semibold text-white leading-tight">{m.name}</h3>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">{m.description}</p>

            {/* Details */}
            <ul className="space-y-1">
              {m.details.map((d) => (
                <li key={d} className="flex items-start gap-2 text-xs text-slate-400">
                  <span className="text-cyan-400 mt-0.5">›</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

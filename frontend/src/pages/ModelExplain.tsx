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
    name: "Groq AI Copilot — Llama 3.1",
    icon: "✨",
    description:
      "Meta's Llama 3.1 (8B Instant) served via Groq's ultra-fast inference API powers the AI Copilot on the Dashboard. It is system-prompted as a sales analytics expert and receives live KPI data (sentiment %, risk level, sales drop) so answers are grounded in your actual numbers — not generic advice.",
    details: [
      "Model: llama-3.1-8b-instant via Groq API (primary)",
      "Fallback: Gemini 1.5 Flash via Google Generative Language API",
      "Live dashboard context injected into every prompt",
      "Full message history — multi-turn conversational UI",
      "12 predefined quick-questions covering Dashboard, Comments, Report & Model",
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
  {
    tag: "RAG Pipeline",
    name: "RAG Chatbot — File Q&A",
    icon: "📂",
    description:
      "A Retrieval-Augmented Generation pipeline that lets users upload any document and ask natural language questions about it. Documents are chunked, indexed with TF-IDF, and the most relevant chunks are passed as context to Groq's Llama 3.1 to generate accurate, grounded answers.",
    details: [
      "Supported formats: PDF, DOCX, XLSX/XLS, CSV, PPTX, TXT, MD",
      "Retrieval: TF-IDF + cosine similarity via scikit-learn (no GPU needed)",
      "LLM: Groq llama-3.1-8b-instant (primary) → Gemini fallback",
      "Runs in a ThreadPoolExecutor to keep FastAPI responsive",
      "Max 150 chunks per document to prevent memory overload",
    ],
  },
  {
    tag: "Reporting",
    name: "PDF Export Engine",
    icon: "📥",
    description:
      "A fully client-side PDF generator that creates a 2-page branded report on demand. Page 1 is a professional cover with a risk badge and headline KPIs. Page 2 contains detailed metric bars, priority action items, and an optional screenshot of the Revenue Impact chart.",
    details: [
      "Library: jsPDF (vector drawing) + html2canvas (chart screenshot)",
      "White background, FORESIGHT branding, cyan accents",
      "Auto-named file: FORESIGHT_Brand_Product_Date.pdf",
      "Colored dots instead of emoji — renders correctly in all PDF viewers",
      "No backend required — runs entirely in the browser",
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

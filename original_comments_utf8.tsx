import { useEffect, useState } from 'react';
import { api, clearSentiment, formatError } from '../api/client';
import type { SocialPostOut } from '../api/types';
import DynamicLoader from '../components/DynamicLoader';
import AlertBanner from '../components/AlertBanner';

type SentimentFilter = '' | 'positive' | 'neutral' | 'negative';

const BADGE = {
  positive: 'bg-green-500/20 text-green-300 border border-green-500/50',
  negative: 'bg-red-500/20 text-red-300 border border-red-500/50',
  neutral: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
};
const EMOJI = { positive: '😊', negative: '😞', neutral: '😐' } as const;

export default function CommentsPage() {
  const product = localStorage.getItem('product_name') || 'NeoGadget';
  const brand   = localStorage.getItem('brand_name')   || 'BlueNova';

  const [data, setData] = useState<SocialPostOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [reclassifying, setReclassifying] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<SentimentFilter>('');

  // counts per sentiment for filter bar badges
  const counts = data.reduce((acc, p) => {
    const lbl = (p.sentiment_label || '').toLowerCase() as SentimentFilter;
    if (lbl) acc[lbl] = (acc[lbl] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: comments } = await api.get<SocialPostOut[]>('/comments', {
        params: {
          product_name: product,
          brand_name:   brand,
          platform:     'YouTube',
          sentiment_filter: filter || undefined,
        },
        timeout: 30000,
      });
      setData(comments);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please refresh.');
      } else {
        setError(formatError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReclassify = async () => {
    setReclassifying(true);
    setError('');
    try {
      await clearSentiment(product, brand);
      await fetchData();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setReclassifying(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]); // eslint-disable-line

  const displayed = filter
    ? data.filter(p => (p.sentiment_label || '').toLowerCase() === filter)
    : data;

  return (
    <div className="glass neon-border rounded-2xl p-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">Comments</p>
          <h2 className="text-2xl font-semibold text-white">YouTube Comments Feed</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 px-2 py-0.5 text-[10px] text-cyan-300">
              ✦ Relevance filter active
            </span>
            <span className="text-xs text-slate-500">
              {product} · {brand}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleReclassify}
            disabled={reclassifying || loading}
            className="flex items-center gap-1 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/60 transition disabled:opacity-50"
          >
            {reclassifying ? '⟳ Working…' : '🔄 Re-classify'}
          </button>
          <button
            onClick={fetchData}
            disabled={loading || reclassifying}
            className="rounded-xl border border-cyan-500/30 bg-slate-950 px-3 py-2 text-xs text-cyan-300 hover:bg-slate-800 transition disabled:opacity-50"
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* SENTIMENT FILTER BAR */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['', 'positive', 'neutral', 'negative'] as SentimentFilter[]).map(f => (
          <button
            key={f || 'all'}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wide transition-all ${
              filter === f
                ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-500/60'
                : 'border border-cyan-500/30 text-slate-300 hover:border-cyan-500/60'
            }`}
          >
            {f === '' ? `All (${data.length})` : `${EMOJI[f as keyof typeof EMOJI]} ${f} (${counts[f] ?? 0})`}
          </button>
        ))}
      </div>

      {/* STATES */}
      {(loading || reclassifying) && (
        <div className="mt-8">
          <DynamicLoader message={reclassifying ? 'Re-classifying comments…' : 'Fetching comments…'} />
        </div>
      )}
      {error && <AlertBanner message={error} tone="error" />}

      {!loading && !reclassifying && !error && displayed.length === 0 && (
        <div className="mt-4 text-sm text-slate-400">
          No {filter ? `${filter} ` : ''}comments found.
          {!filter && ' Run an analysis first from the Analyze page.'}
        </div>
      )}

      {/* COMMENTS TABLE */}
      {!loading && !reclassifying && !error && displayed.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="bg-slate-900/70 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-xs font-semibold text-slate-400">Date</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-400 w-36">Sentiment</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-400 w-44">Score</th>
                <th className="px-3 py-2 text-xs font-semibold text-slate-400">Comment</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(p => {
                const lbl = (p.sentiment_label || '').toLowerCase() as keyof typeof EMOJI;
                return (
                  <tr key={p.id} className="border-b border-slate-800/70 hover:bg-slate-800/30 transition-colors">
                    <td className="px-3 py-2.5 text-slate-400 text-xs whitespace-nowrap">{p.posted_at}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        lbl in BADGE ? BADGE[lbl as keyof typeof BADGE] : 'bg-slate-700/50 text-slate-400 border border-slate-600/50'
                      }`}>
                        {lbl in EMOJI ? `${EMOJI[lbl as keyof typeof EMOJI]} ${lbl.toUpperCase()}` : 'Not analyzed'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {typeof p.sentiment_score === 'number' ? (
                        <div className="flex flex-col gap-0.5 w-36">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-mono text-cyan-400">{p.sentiment_score.toFixed(3)}</span>
                            <span className="text-slate-400">{Math.round((p.sentiment_score + 1) * 50)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${p.sentiment_score > 0 ? 'bg-green-500' : p.sentiment_score < 0 ? 'bg-red-500' : 'bg-yellow-500'}`}
                              style={{ width: `${Math.round((p.sentiment_score + 1) * 50)}%` }}
                            />
                          </div>
                        </div>
                      ) : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-sm">
                      <p className="line-clamp-2 text-xs leading-relaxed">{p.content}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

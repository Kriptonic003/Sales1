import { useEffect, useState } from 'react';
import { api, formatError } from '../api/client';
import type { SocialPostOut } from '../api/types';
import DynamicLoader from '../components/DynamicLoader';
import AlertBanner from '../components/AlertBanner';

export default function CommentsPage() {
  const [data, setData] = useState<SocialPostOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<
    '' | 'positive' | 'neutral' | 'negative'
  >('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const { data } = await api.get<SocialPostOut[]>('/comments', {
        params: {
          product_name: localStorage.getItem('product_name') || 'NeoGadget',
          brand_name: localStorage.getItem('brand_name') || 'BlueNova',
          platform: 'YouTube', // 🔒 Force YouTube
          sentiment_filter: filter || undefined,
        },
        signal: controller.signal,
      });
      setData(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(
          'Request timeout - comments are taking too long to load. Please try refreshing the page.'
        );
      } else {
        setError(formatError(err));
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <div className="glass neon-border rounded-2xl p-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-200/80">
            Comments
          </p>
          <h2 className="text-2xl font-semibold text-white">
            YouTube Comments Feed
          </h2>
        </div>

        {/* SENTIMENT FILTERS */}
        <div className="flex items-center gap-2">
          {['', 'positive', 'neutral', 'negative'].map(f => (
            <button
              key={f || 'all'}
              onClick={() => setFilter(f as any)}
              className={`rounded-full px-3 py-2 text-xs uppercase tracking-wide ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-100'
                  : 'border border-cyan-500/30 text-slate-200'
              }`}
            >
              {f === '' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* STATES */}
      {loading && (
        <div className="mt-8">
          <DynamicLoader message="Fetching comments..." />
        </div>
      )}
      {error && <AlertBanner message={error} tone="error" />}

      {/* NO COMMENTS STATE */}
      {!loading && !error && data.length === 0 && (
        <div className="mt-4 text-sm text-slate-400">
          No comments to be fetched.
        </div>
      )}

      {/* COMMENTS TABLE */}
      {!loading && !error && data.length > 0 && (
        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-left text-sm text-slate-100">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Platform</th>
                <th className="px-3 py-2 w-40">Sentiment Label</th>
                <th className="px-3 py-2 w-48">Sentiment Score</th>
                <th className="px-3 py-2">Comment</th>
              </tr>
            </thead>
            <tbody>
              {data.map(p => (
                <tr
                  key={p.id}
                  className="border-b border-slate-800/70 hover:bg-slate-800/30"
                >
                  <td className="px-3 py-2 text-slate-400 text-xs">
                    {p.posted_at}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{p.platform}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        p.sentiment_label === 'positive'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                          : p.sentiment_label === 'negative'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                      }`}
                    >
                      {p.sentiment_label === 'positive'
                        ? '😊 '
                        : p.sentiment_label === 'negative'
                          ? '😞 '
                          : '😐 '}
                      {(p.sentiment_label || 'pending').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-full max-w-xs">
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-mono text-cyan-400">
                            {typeof p.sentiment_score === 'number'
                              ? p.sentiment_score.toFixed(3)
                              : '—'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {typeof p.sentiment_score === 'number'
                              ? `${Math.round((p.sentiment_score + 1) * 50)}%`
                              : '—'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              p.sentiment_score && p.sentiment_score > 0
                                ? 'bg-green-500'
                                : p.sentiment_score && p.sentiment_score < 0
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500'
                            }`}
                            style={{
                              width: `${
                                p.sentiment_score
                                  ? Math.round((p.sentiment_score + 1) * 50)
                                  : 50
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-300 max-w-md truncate hover:text-wrap">
                    {p.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

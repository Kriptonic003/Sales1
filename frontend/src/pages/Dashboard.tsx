import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Pie,
  PieChart,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { api, formatError } from '../api/client';
import type { DashboardResponse } from '../api/types';
import KPICard from '../components/KPICard';
import ChartCard from '../components/ChartCard';
import DynamicLoader from '../components/DynamicLoader';
import AlertBanner from '../components/AlertBanner';
import ChatPanel from '../components/ChatPanel';

const PIE_COLORS = ['#22d3ee', '#38bdf8', '#6366f1'];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DashboardResponse>('/get-dashboard-data', {
        params: {
          product_name: localStorage.getItem('product_name') || 'S23',
          brand_name: localStorage.getItem('brand_name') || 'Samsung',
          platform: 'YouTube', // 🔒 Locked to YouTube
        },
      });
      setData(res.data);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hasComments =
    data &&
    Array.isArray(data.comment_volume) &&
    data.comment_volume.length > 0;

  const hasSales =
    data && Array.isArray(data.sales_series) && data.sales_series.length > 0;

  const kpiTone = (risk: string) => {
    if (risk === 'High') return 'bad';
    if (risk === 'Medium') return 'warn';
    return 'good';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DynamicLoader message="Loading Dashboard..." size="lg" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.6fr_0.9fr]">
      {/* LEFT SECTION */}
      <div className="space-y-4">
        {/* KPI CARDS */}
        <div className="grid gap-3 md:grid-cols-4 sm:grid-cols-2">
          {!loading && data && hasComments && (
            <>
              <KPICard
                label="Average Sentiment"
                value={data.kpis.average_sentiment.toFixed(2)}
                subtext="30d rolling"
                tone={kpiTone(data.kpis.risk_level) as any}
              />
              <KPICard
                label="% Negative"
                value={`${data.kpis.negative_percentage.toFixed(1)}%`}
                subtext="YouTube comments"
                tone={data.kpis.negative_percentage > 35 ? 'bad' : 'warn'}
              />
              <KPICard
                label="Predicted Sales Drop"
                value={`${data.kpis.predicted_sales_drop.toFixed(1)}%`}
                subtext="Short-term"
                tone={kpiTone(data.kpis.risk_level) as any}
              />
              <KPICard
                label="Risk Level"
                value={data.kpis.risk_level}
                tone={kpiTone(data.kpis.risk_level) as any}
              />
            </>
          )}
        </div>

        {/* NO DATA MESSAGE */}
        {!loading && data && !hasComments && (
          <div className="glass neon-border rounded-2xl p-5 text-slate-400">
            No YouTube comments available to display dashboard analytics.
          </div>
        )}

        {/* SENTIMENT BREAKDOWN CARDS */}
        {!loading && data && hasComments && (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="glass neon-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cyan-200/70">
                    Positive
                  </p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {data.kpis.positive_count ?? 0}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(data.kpis.positive_percentage ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-3xl">😊</div>
              </div>
              <div className="mt-3 h-1 bg-green-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${Math.min(data.kpis.positive_percentage ?? 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="glass neon-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cyan-200/70">
                    Neutral
                  </p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">
                    {data.kpis.neutral_count ?? 0}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(data.kpis.neutral_percentage ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-3xl">😐</div>
              </div>
              <div className="mt-3 h-1 bg-yellow-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{
                    width: `${Math.min(data.kpis.neutral_percentage ?? 0, 100)}%`,
                  }}
                />
              </div>
            </div>

            <div className="glass neon-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-cyan-200/70">
                    Negative
                  </p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    {data.kpis.negative_count ?? 0}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(data.kpis.negative_percentage ?? 0).toFixed(1)}%
                  </p>
                </div>
                <div className="text-3xl">😞</div>
              </div>
              <div className="mt-3 h-1 bg-red-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${Math.min(data.kpis.negative_percentage ?? 0, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CHARTS */}
        {!loading && data && hasComments && (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <ChartCard title="Sentiment Trend (30d)">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.sentiment_trend}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[-1, 1]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="average_sentiment"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Sentiment Distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(data.sentiment_distribution).map(
                        ([name, value]) => ({ name, value })
                      )}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {Object.keys(data.sentiment_distribution).map(
                        (_, index) => (
                          <Cell
                            key={index}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        )
                      )}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {hasComments && (
                <ChartCard title="Comment Volume">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.comment_volume}>
                      <XAxis dataKey="date" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="total_posts"
                        fill="#22d3ee"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {hasSales && (
                <ChartCard title="Actual vs Predicted Sales">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.sales_series}>
                      <XAxis dataKey="date" hide />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="actual_revenue"
                        stroke="#38bdf8"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="predicted_revenue"
                        stroke="#22d3ee"
                        strokeDasharray="4 4"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            {/* ENGAGEMENT METRICS */}
            <div className="grid gap-3 md:grid-cols-3">
              <ChartCard title="Sentiment Score Gauge">
                <div className="flex items-center justify-center py-4">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="8"
                        strokeDasharray={`${
                          ((data.kpis.average_sentiment + 1) / 2) * 282.7
                        } 282.7`}
                        transform="rotate(-90 50 50)"
                      />
                      <text
                        x="50"
                        y="55"
                        textAnchor="middle"
                        className="text-lg font-bold fill-cyan-400"
                        fontSize="14"
                      >
                        {data.kpis.average_sentiment.toFixed(2)}
                      </text>
                    </svg>
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Engagement Rate">
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="text-4xl font-bold text-cyan-400">
                    {data.comment_volume.length > 0
                      ? (
                          (data.comment_volume.reduce(
                            (sum, c) => sum + c.total_posts,
                            0
                          ) /
                            data.comment_volume.length) *
                          0.1
                        ).toFixed(1)
                      : '0'}
                    %
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Average engagement
                  </p>
                  <div className="mt-4 flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i <=
                          Math.min(
                            Math.round((data.kpis.average_sentiment + 1) * 2.5),
                            5
                          )
                            ? 'bg-cyan-400'
                            : 'bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Risk Indicator">
                <div className="flex flex-col items-center justify-center py-8">
                  <div
                    className={`text-4xl font-bold ${
                      data.kpis.risk_level === 'High'
                        ? 'text-red-400'
                        : data.kpis.risk_level === 'Medium'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                    }`}
                  >
                    {data.kpis.risk_level}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Risk Assessment</p>
                  <div className="mt-4 flex gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        data.kpis.risk_level === 'High'
                          ? 'bg-red-400'
                          : 'bg-slate-700'
                      }`}
                    />
                    <div
                      className={`h-3 w-3 rounded-full ${
                        data.kpis.risk_level === 'Medium'
                          ? 'bg-yellow-400'
                          : 'bg-slate-700'
                      }`}
                    />
                    <div
                      className={`h-3 w-3 rounded-full ${
                        data.kpis.risk_level === 'Low'
                          ? 'bg-green-400'
                          : 'bg-slate-700'
                      }`}
                    />
                  </div>
                </div>
              </ChartCard>
            </div>

            {/* ADVANCED METRICS */}
            <div className="grid gap-3 md:grid-cols-2">
              <ChartCard title="Sentiment Impact Analysis">
                <div className="space-y-3 py-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Positive Impact</span>
                      <span className="text-cyan-400">
                        +
                        {((data.kpis.positive_percentage ?? 0) * 0.5).toFixed(
                          1
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${Math.min(data.kpis.positive_percentage ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Neutral Impact</span>
                      <span className="text-cyan-400">
                        ±
                        {((data.kpis.neutral_percentage ?? 0) * 0.2).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{
                          width: `${Math.min(data.kpis.neutral_percentage ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Negative Impact</span>
                      <span className="text-red-400">
                        -{(data.kpis.negative_percentage * 0.8).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${Math.min(data.kpis.negative_percentage ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Sales Impact Metrics">
                <div className="space-y-4 py-2">
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-slate-300">Predicted Drop</span>
                      <span className="text-red-400 font-semibold">
                        {data.kpis.predicted_sales_drop.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${Math.min(data.kpis.predicted_sales_drop, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">
                      📊 Based on sentiment analysis and historical patterns
                    </p>
                  </div>
                </div>
              </ChartCard>
            </div>
          </>
        )}

        {/* AI INSIGHTS */}
        {!loading && data && hasComments && (
          <div className="glass neon-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <span>✨</span> AI Insights
              </h3>
              <button
                onClick={fetchData}
                className="rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-100 hover:border-cyan-400 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>

            <div className="grid gap-2">
              {data.ai_insights.map((i, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 px-4 py-3 hover:border-cyan-400/40 transition-colors"
                >
                  <div className="text-sm text-slate-200 leading-relaxed">
                    {idx === 0
                      ? '🔍'
                      : idx === 1
                        ? '📈'
                        : idx === 2
                          ? '⚠️'
                          : '💡'}{' '}
                    {i}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUMMARY STATISTICS */}
        {!loading && data && hasComments && (
          <div className="glass neon-border rounded-2xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              📊 Summary
            </h3>
            <div className="grid gap-2 text-sm text-slate-300">
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <span>Total Comments Analyzed</span>
                <span className="text-cyan-400 font-semibold">
                  {data.comment_volume.reduce(
                    (sum, c) => sum + c.total_posts,
                    0
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <span>Date Range</span>
                <span className="text-cyan-400 font-semibold">
                  {data.comment_volume.length > 0
                    ? `${data.comment_volume.length} days`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <span>Average Daily Comments</span>
                <span className="text-cyan-400 font-semibold">
                  {data.comment_volume.length > 0
                    ? Math.round(
                        data.comment_volume.reduce(
                          (sum, c) => sum + c.total_posts,
                          0
                        ) / data.comment_volume.length
                      )
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Most Common Sentiment</span>
                <span className="text-cyan-400 font-semibold capitalize">
                  {
                    Object.entries(data.sentiment_distribution).reduce(
                      (a, b) => ((a[1] as number) > (b[1] as number) ? a : b)
                    )[0]
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {error && <AlertBanner message={error} tone="error" />}
      </div>

      {/* RIGHT PANEL */}
      <div className="space-y-4">
        <ChatPanel />
        <div className="glass neon-border rounded-2xl p-4">
          <h3 className="text-lg font-semibold text-white">Explanation</h3>
          <p className="mt-2 text-sm text-slate-300">
            We aggregate YouTube comment sentiment, classify polarity, and blend
            with historical revenue. Logistic regression estimates loss
            probability; linear regression projects near-term revenue.
          </p>
        </div>
      </div>
    </div>
  );
}

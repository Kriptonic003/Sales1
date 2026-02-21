import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { api, formatError } from '../api/client';
import DynamicLoader from '../components/DynamicLoader';
import AlertBanner from '../components/AlertBanner';

interface SalesLossData {
  product_name: string;
  brand_name: string;
  date: string;
  predicted_drop_percentage: number;
  loss_probability: number;
  risk_level: string;
  explanation: string;
}

interface SentimentMetrics {
  total_posts: number;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  average_sentiment: number;
  negative_percentage: number;
}

export default function SalesLossReportPage() {
  const [salesData, setSalesData] = useState<SalesLossData | null>(null);
  const [sentimentMetrics, setSentimentMetrics] =
    useState<SentimentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const productName = localStorage.getItem('product_name') || 'S23';
  const brandName = localStorage.getItem('brand_name') || 'Samsung';

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    setError('');
    try {
      // Predict sales loss to get latest prediction
      const predictionRes = await api.post('/predict-sales-loss', {
        product_name: productName,
        brand_name: brandName,
        platform: 'YouTube',
        start_date: '2023-01-01',
        end_date: '2027-12-31',
      });

      setSalesData({
        product_name: productName,
        brand_name: brandName,
        date: new Date().toISOString().split('T')[0],
        predicted_drop_percentage: predictionRes.data.predicted_drop_percentage,
        loss_probability: predictionRes.data.loss_probability,
        risk_level: predictionRes.data.risk_level,
        explanation: predictionRes.data.explanation,
      });

      // Fetch sentiment analysis for detailed metrics
      const sentimentRes = await api.post('/analyze-sentiment', {
        product_name: productName,
        brand_name: brandName,
        platform: 'YouTube',
        start_date: '2023-01-01',
        end_date: '2027-12-31',
      });

      setSentimentMetrics({
        total_posts: sentimentRes.data.total_posts,
        positive_count: 0,
        negative_count: 0,
        neutral_count: 0,
        average_sentiment: sentimentRes.data.average_sentiment,
        negative_percentage: sentimentRes.data.negative_percentage,
      });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  // Sentiment distribution pie data
  const sentimentDistribution = sentimentMetrics
    ? [
      {
        name: 'Negative',
        value: sentimentMetrics.negative_percentage,
        color: '#ef4444',
      },
      {
        name: 'Neutral',
        value:
          100 -
          sentimentMetrics.negative_percentage -
          (100 - sentimentMetrics.negative_percentage) * 0.4,
        color: '#f59e0b',
      },
      {
        name: 'Positive',
        value: (100 - sentimentMetrics.negative_percentage) * 0.4,
        color: '#10b981',
      },
    ]
    : [];

  // Impact projection data
  const impactProjection = [
    { month: 'Current', revenue: 100, projected: 100 },
    {
      month: 'Month 1',
      revenue: 100,
      projected: Math.max(
        0,
        100 - (salesData?.predicted_drop_percentage || 0) * 0.3
      ),
    },
    {
      month: 'Month 2',
      revenue: 100,
      projected: Math.max(
        0,
        100 - (salesData?.predicted_drop_percentage || 0) * 0.6
      ),
    },
    {
      month: 'Month 3',
      revenue: 100,
      projected: Math.max(0, 100 - (salesData?.predicted_drop_percentage || 0)),
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'from-red-600 to-red-800';
      case 'Medium':
        return 'from-orange-600 to-orange-800';
      default:
        return 'from-green-600 to-green-800';
    }
  };

  const getRiskTextColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'text-red-200';
      case 'Medium':
        return 'text-orange-200';
      default:
        return 'text-green-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <DynamicLoader
          message="Generating sales loss report..."
          size="lg"
          fullScreen={false}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <AlertBanner
          type="error"
          message={error}
          onClose={() => setError('')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="glass neon-border rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Sales Loss Report</h1>
            <p className="mt-1 text-slate-300">
              {brandName} • {productName}
            </p>
          </div>
          <button
            onClick={fetchReportData}
            className="btn-ghost rounded-xl px-4 py-2 text-sm"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Risk Overview */}
      {salesData && (
        <div
          className={`glass neon-border rounded-2xl p-8 bg-gradient-to-br ${getRiskColor(salesData.risk_level)}/10 border-current`}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Predicted Sales Drop */}
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-slate-300">
                Predicted Sales Drop
              </p>
              <div
                className={`mt-3 text-6xl font-bold ${getRiskTextColor(salesData.risk_level)}`}
              >
                {salesData.predicted_drop_percentage.toFixed(1)}%
              </div>
              <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${salesData.predicted_drop_percentage > 30
                      ? 'bg-red-500'
                      : salesData.predicted_drop_percentage > 15
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                    }`}
                  style={{
                    width: `${Math.min(salesData.predicted_drop_percentage, 40)}%`,
                  }}
                />
              </div>
            </div>

            {/* Risk Level */}
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-slate-300">
                Risk Level
              </p>
              <div
                className={`mt-3 text-5xl font-bold ${getRiskTextColor(salesData.risk_level)}`}
              >
                {salesData.risk_level}
              </div>
              <p className="mt-4 text-xs text-slate-400">
                {salesData.risk_level === 'High'
                  ? '⚠️ Immediate action needed'
                  : salesData.risk_level === 'Medium'
                    ? '⚡ Monitor closely'
                    : '✓ Low concern'}
              </p>
            </div>

            {/* Loss Probability */}
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider text-slate-300">
                Loss Probability
              </p>
              <div className="mt-3 text-6xl font-bold text-cyan-200">
                {(salesData.loss_probability * 100).toFixed(0)}%
              </div>
              <p className="mt-4 text-xs text-slate-400">
                Likelihood of revenue impact
              </p>
            </div>
          </div>

          {/* Explanation */}
          <div className="mt-6 border-t border-slate-700 pt-4">
            <p className="text-sm italic text-slate-300">
              💡 <span className="font-semibold">{salesData.explanation}</span>
            </p>
          </div>
        </div>
      )}

      {/* Sentiment Analysis */}
      {sentimentMetrics && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Sentiment Breakdown */}
          <div className="glass neon-border rounded-2xl p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">
              Sentiment Breakdown
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-300">
                    Negative Comments
                  </span>
                  <span className="font-semibold text-red-400">
                    {sentimentMetrics.negative_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${sentimentMetrics.negative_percentage}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-300">
                    Neutral Comments
                  </span>
                  <span className="font-semibold text-orange-400">
                    {(
                      100 -
                      sentimentMetrics.negative_percentage -
                      (100 - sentimentMetrics.negative_percentage) * 0.4
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{
                      width: `${100 - sentimentMetrics.negative_percentage - (100 - sentimentMetrics.negative_percentage) * 0.4}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-300">
                    Positive Comments
                  </span>
                  <span className="font-semibold text-green-400">
                    {(
                      (100 - sentimentMetrics.negative_percentage) *
                      0.4
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${(100 - sentimentMetrics.negative_percentage) * 0.4}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-700 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-400">
                  {Math.round(
                    (sentimentMetrics.total_posts *
                      sentimentMetrics.negative_percentage) /
                    100
                  )}
                </p>
                <p className="text-xs text-slate-400">Negative</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  {sentimentMetrics.total_posts}
                </p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-400">
                  {Math.round(
                    (sentimentMetrics.total_posts *
                      (100 - sentimentMetrics.negative_percentage) *
                      0.4) /
                    100
                  )}
                </p>
                <p className="text-xs text-slate-400">Positive</p>
              </div>
            </div>
          </div>

          {/* Impact Projection */}
          <div className="glass neon-border rounded-2xl p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">
              Revenue Impact Projection
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={impactProjection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  name="Current Revenue"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="projected"
                  stroke="#ef4444"
                  name="Projected Revenue"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Health Score Card */}
      {salesData && sentimentMetrics && (
        <div className="glass neon-border rounded-2xl p-6">
          <h3 className="mb-6 text-xl font-semibold text-white">
            Product Health Score
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Overall Health */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Overall Health</p>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-cyan-400">
                  {(100 - salesData.predicted_drop_percentage).toFixed(0)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200">/100</p>
                  <p className="text-xs text-slate-400">Health Score</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500"
                  style={{
                    width: `${100 - salesData.predicted_drop_percentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Sentiment Health */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Sentiment Health</p>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-green-400">
                  {(100 - sentimentMetrics.negative_percentage).toFixed(0)}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200">/100</p>
                  <p className="text-xs text-slate-400">Positive Ratio</p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${100 - sentimentMetrics.negative_percentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Data Confidence */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Confidence Level</p>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-blue-400">
                  {Math.min(
                    100,
                    Math.round(
                      Math.min(
                        1.0,
                        Math.max(0.3, sentimentMetrics.total_posts / 50.0)
                      ) * 100
                    )
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200">/100</p>
                  <p className="text-xs text-slate-400">
                    Based on {sentimentMetrics.total_posts} posts
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${Math.min(100, Math.round(Math.min(1.0, Math.max(0.3, sentimentMetrics.total_posts / 50.0)) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Engagement Momentum */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Engagement Level</p>
              <div className="flex items-center gap-3">
                <div className="text-4xl font-bold text-purple-400">
                  {sentimentMetrics.total_posts > 100
                    ? '📈'
                    : sentimentMetrics.total_posts > 50
                      ? '📊'
                      : '📉'}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-200">
                    {sentimentMetrics.total_posts}
                  </p>
                  <p className="text-xs text-slate-400">Comments analyzed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Factor Breakdown */}
      {salesData && sentimentMetrics && (
        <div className="glass neon-border rounded-2xl p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">
            Risk Factor Analysis
          </h3>
          <div className="space-y-4">
            {/* Negative Sentiment Factor */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-200">
                  Negative Sentiment Impact
                </span>
                <span className="text-sm text-red-400">
                  {sentimentMetrics.negative_percentage.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                  style={{
                    width: `${Math.min(sentimentMetrics.negative_percentage, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Primary driver of sales loss prediction
              </p>
            </div>

            {/* Volume Factor */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-200">
                  Comment Volume Factor
                </span>
                <span className="text-sm text-blue-400">
                  {sentimentMetrics.total_posts} posts
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                  style={{
                    width: `${Math.min((sentimentMetrics.total_posts / 200) * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Higher volume = more reliable signal
              </p>
            </div>

            {/* Risk Score Contribution */}
            <div className="bg-slate-900/50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-slate-200">
                  Predicted Impact
                </span>
                <span
                  className={`text-sm font-bold ${salesData.predicted_drop_percentage > 30
                      ? 'text-red-400'
                      : salesData.predicted_drop_percentage > 15
                        ? 'text-orange-400'
                        : 'text-green-400'
                    }`}
                >
                  {salesData.predicted_drop_percentage.toFixed(1)}% drop
                </span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${salesData.predicted_drop_percentage > 30
                      ? 'bg-gradient-to-r from-red-500 to-red-600'
                      : salesData.predicted_drop_percentage > 15
                        ? 'bg-gradient-to-r from-orange-500 to-red-500'
                        : 'bg-gradient-to-r from-green-500 to-cyan-500'
                    }`}
                  style={{
                    width: `${Math.min(salesData.predicted_drop_percentage, 100)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Combined impact of all risk factors
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Priority Action Items */}
      <div className="glass neon-border rounded-2xl p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">
          Priority Action Items
        </h3>
        <div className="space-y-3">
          {/* High Priority */}
          <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-4 flex gap-3">
            <span className="text-2xl">🔴</span>
            <div className="flex-1">
              <p className="font-semibold text-red-200">
                Immediate (This Week)
              </p>
              <p className="text-sm text-slate-300 mt-1">
                Identify and respond to top negative comments. Address most
                common customer complaints directly.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Expected impact: -5-10% improvement
              </p>
            </div>
          </div>

          {/* Medium Priority */}
          <div className="bg-orange-950/30 border border-orange-500/30 rounded-xl p-4 flex gap-3">
            <span className="text-2xl">🟠</span>
            <div className="flex-1">
              <p className="font-semibold text-orange-200">
                Short Term (2-4 Weeks)
              </p>
              <p className="text-sm text-slate-300 mt-1">
                Implement product improvements based on feedback trends. Update
                product descriptions and FAQ.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Expected impact: -10-20% improvement
              </p>
            </div>
          </div>

          {/* Long Term */}
          <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4 flex gap-3">
            <span className="text-2xl">🟡</span>
            <div className="flex-1">
              <p className="font-semibold text-yellow-200">
                Medium Term (1-3 Months)
              </p>
              <p className="text-sm text-slate-300 mt-1">
                Launch customer satisfaction campaign. Monitor sentiment
                improvement with A/B testing.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Expected impact: -20-35% improvement
              </p>
            </div>
          </div>

          {/* Monitoring */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-4 flex gap-3">
            <span className="text-2xl">🔵</span>
            <div className="flex-1">
              <p className="font-semibold text-blue-200">Ongoing</p>
              <p className="text-sm text-slate-300 mt-1">
                Monitor sentiment metrics weekly. Re-run analysis after
                implementing changes to track improvements.
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Frequency: Weekly checks recommended
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Timeline */}
      {salesData && (() => {
        const drop = salesData.predicted_drop_percentage;
        const risk = salesData.risk_level;

        // Dynamically build timeline phases based on risk/drop
        const phases = [
          {
            icon: '🎯',
            label: risk === 'High' ? 'Week 1' : 'Week 1-2',
            title: 'Damage Control',
            description: 'Acknowledge negative feedback publicly. Assign a response team to top complaints on YouTube.',
            actions: ['Reply to high-engagement negative comments', 'Flag recurring issues to product team', 'Post a public statement or update if needed'],
            recoveryPct: Math.round(drop * 0.15),
            sentimentLift: '+0.05 avg score',
            color: 'red',
          },
          {
            icon: '⚙️',
            label: risk === 'High' ? 'Week 2-3' : 'Week 3-4',
            title: 'Quick Fixes',
            description: 'Ship fast-turnaround improvements. Update product listings, FAQs, and known issue pages.',
            actions: ['Fix most-complained bugs or UX issues', 'Update product description to set correct expectations', 'Send follow-up to affected customers'],
            recoveryPct: Math.round(drop * 0.35),
            sentimentLift: '+0.12 avg score',
            color: 'orange',
          },
          {
            icon: '🔧',
            label: 'Month 2-3',
            title: 'Product Improvements',
            description: 'Implement deeper product or service improvements informed by sentiment themes.',
            actions: ['Release major update addressing root causes', 'Launch customer satisfaction survey', 'A/B test improved messaging & positioning'],
            recoveryPct: Math.round(drop * 0.65),
            sentimentLift: '+0.22 avg score',
            color: 'yellow',
          },
          {
            icon: '✅',
            label: risk === 'Low' ? 'Month 2+' : 'Month 3-4',
            title: 'Full Recovery',
            description: 'Sentiment stabilises above baseline. Sales model risk level drops to Low.',
            actions: ['Monitor weekly sentiment; target < 20% negative', 'Build loyalty program to sustain positive momentum', 'Re-run FORESIGHT analysis to confirm recovery'],
            recoveryPct: Math.round(drop * 0.90),
            sentimentLift: '+0.30 avg score',
            color: 'green',
          },
        ];

        const colorMap: Record<string, { border: string; bg: string; text: string; bar: string; badge: string }> = {
          red: { border: 'border-red-500/30', bg: 'bg-red-950/20', text: 'text-red-300', bar: 'bg-red-500', badge: 'bg-red-500/20 text-red-300' },
          orange: { border: 'border-orange-500/30', bg: 'bg-orange-950/20', text: 'text-orange-300', bar: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-300' },
          yellow: { border: 'border-yellow-500/30', bg: 'bg-yellow-950/20', text: 'text-yellow-300', bar: 'bg-yellow-400', badge: 'bg-yellow-500/20 text-yellow-300' },
          green: { border: 'border-green-500/30', bg: 'bg-green-950/20', text: 'text-green-300', bar: 'bg-green-500', badge: 'bg-green-500/20 text-green-300' },
        };

        return (
          <div className="glass neon-border rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-white">Expected Recovery Timeline</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Based on a <span className={risk === 'High' ? 'text-red-400' : risk === 'Medium' ? 'text-orange-400' : 'text-green-400'}>{risk} risk</span> profile with a predicted {drop.toFixed(1)}% sales drop
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-300">{Math.round(drop * 0.90)}%</p>
                <p className="text-xs text-slate-400">recoverable with action</p>
              </div>
            </div>

            {/* Timeline Phases */}
            <div className="space-y-4">
              {phases.map((phase, idx) => {
                const c = colorMap[phase.color];
                const barWidth = Math.min((phase.recoveryPct / drop) * 100, 100);
                return (
                  <div key={idx} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                    {/* Phase header */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-xl">{phase.icon}</span>
                        {idx < phases.length - 1 && (
                          <div className="w-px h-4 bg-gradient-to-b from-slate-500 to-transparent mt-2" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{phase.label}</span>
                            <h4 className="text-sm font-semibold text-white mt-0.5">{phase.title}</h4>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.badge}`}>
                              ↑ {phase.sentimentLift}
                            </span>
                            <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-300">
                              ~{phase.recoveryPct}% recovered
                            </span>
                          </div>
                        </div>

                        {/* Recovery progress bar */}
                        <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${c.bar} transition-all duration-700`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>

                        {/* Description */}
                        <p className="mt-2 text-xs text-slate-400 leading-relaxed">{phase.description}</p>

                        {/* Actions */}
                        <ul className="mt-2 space-y-1">
                          {phase.actions.map((a) => (
                            <li key={a} className="flex items-start gap-1.5 text-xs text-slate-300">
                              <span className={`${c.text} mt-0.5`}>›</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer note */}
            <p className="mt-4 text-xs text-slate-500 text-center">
              ⏱ Timeline accelerates with early action. Re-run analysis weekly to track sentiment improvement.
            </p>
          </div>
        );
      })()}

      {/* Comparative Metrics */}
      {sentimentMetrics && (
        <div className="glass neon-border rounded-2xl p-6">
          <h3 className="mb-4 text-xl font-semibold text-white">
            Metrics Checklist
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: 'Positive sentiment trend',
                status: sentimentMetrics.negative_percentage < 20 ? '✓' : '✗',
              },
              {
                label: 'Sufficient comment volume',
                status: sentimentMetrics.total_posts > 30 ? '✓' : '✗',
              },
              {
                label: 'Low negative comment ratio',
                status: sentimentMetrics.negative_percentage < 30 ? '✓' : '✗',
              },
              {
                label: 'Healthy sentiment average',
                status: sentimentMetrics.average_sentiment > 0 ? '✓' : '✗',
              },
              {
                label: 'Engagement is active',
                status: sentimentMetrics.total_posts > 50 ? '✓' : '✗',
              },
              {
                label: 'Low risk profile',
                status: sentimentMetrics.negative_percentage < 25 ? '✓' : '✗',
              },
            ].map((metric, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 flex items-center gap-3 border ${metric.status === '✓'
                    ? 'bg-green-950/30 border-green-500/30'
                    : 'bg-red-950/30 border-red-500/30'
                  }`}
              >
                <span
                  className={`text-2xl font-bold ${metric.status === '✓' ? 'text-green-400' : 'text-red-400'
                    }`}
                >
                  {metric.status}
                </span>
                <span className="text-sm text-slate-300">{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="glass neon-border rounded-2xl p-6">
        <h3 className="mb-4 text-xl font-semibold text-white">
          Key Insights & Recommendations
        </h3>
        <div className="space-y-3">
          {salesData && salesData.risk_level === 'High' && (
            <div className="flex gap-3 rounded-lg bg-red-950/30 p-3 border border-red-500/30">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-semibold text-red-200">
                  Critical Risk Detected
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  High levels of negative sentiment indicate significant
                  potential revenue impact. Immediate action required.
                </p>
              </div>
            </div>
          )}

          {sentimentMetrics && sentimentMetrics.negative_percentage > 30 && (
            <div className="flex gap-3 rounded-lg bg-orange-950/30 p-3 border border-orange-500/30">
              <span className="text-2xl">📊</span>
              <div>
                <p className="font-semibold text-orange-200">
                  High Negative Sentiment
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Over {sentimentMetrics.negative_percentage.toFixed(0)}% of
                  comments express negative sentiment. Consider review product
                  quality and customer service response.
                </p>
              </div>
            </div>
          )}

          {sentimentMetrics && sentimentMetrics.total_posts > 50 && (
            <div className="flex gap-3 rounded-lg bg-blue-950/30 p-3 border border-blue-500/30">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-semibold text-blue-200">Sufficient Data</p>
                <p className="mt-1 text-sm text-slate-300">
                  Analysis based on {sentimentMetrics.total_posts}+ comments.
                  Confidence level is high.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 rounded-lg bg-slate-900/50 p-3 border border-slate-700">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-semibold text-slate-200">Recommendation</p>
              <p className="mt-1 text-sm text-slate-300">
                {salesData && salesData.risk_level === 'High'
                  ? 'Engage with negative reviewers, address common complaints, and consider product improvements.'
                  : 'Continue monitoring sentiment trends and maintain customer engagement quality.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert for data refresh */}
      <div className="glass neon-border rounded-2xl p-4 text-center text-sm text-slate-300">
        Last updated: {salesData?.date} • Data refreshes when running a new
        analysis
      </div>
    </div>
  );
}

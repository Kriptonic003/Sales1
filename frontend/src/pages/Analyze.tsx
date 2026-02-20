import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatError } from '../api/client';
import type {
  SalesLossPredictionResponse,
  SentimentAnalysisResponse,
} from '../api/types';
import DynamicLoader from '../components/DynamicLoader';

export default function AnalyzePage() {
  const navigate = useNavigate();

  // 🔒 Persist inputs across navigation
  const [product, setProduct] = useState(
    localStorage.getItem('product_name') || 'S23'
  );
  const [brand, setBrand] = useState(
    localStorage.getItem('brand_name') || 'Samsung'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentiment, setSentiment] = useState<SentimentAnalysisResponse | null>(
    null
  );
  const [prediction, setPrediction] =
    useState<SalesLossPredictionResponse | null>(null);

  const submit = async () => {
    if (!product) {
      setError('Please enter a product name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 🔹 STEP 1: Try to fetch YouTube comments (optional - skip if it fails/times out)
      try {
        await api.post('/fetch-youtube-comments', null, {
          params: {
            product_name: product,
            brand_name: brand,
          },
          timeout: 60000, // INCREASED to 60s to ensure fetch completes
        });
      } catch (fetchError) {
        console.warn(
          'YouTube fetch failed or timed out, using existing data:',
          fetchError
        );
        // Continue anyway - we'll use existing database data
      }

      // 🔹 STEP 2: Analyze sentiment (YouTube only)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      try {
        const sentimentResp = await api.post<SentimentAnalysisResponse>(
          '/analyze-sentiment',
          {
            product_name: product,
            brand_name: brand,
            platform: 'YouTube',
            start_date: '2023-01-01',
            end_date: '2027-12-31',
          },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);
        setSentiment(sentimentResp.data);
      } catch (analyzeErr: any) {
        clearTimeout(timeoutId);
        if (analyzeErr.name === 'AbortError') {
          throw new Error(
            'Analysis timeout - took too long. Please try again.'
          );
        }
        throw analyzeErr;
      }

      // 🔹 STEP 3: Predict sales loss
      const predictionController = new AbortController();
      const predictionTimeoutId = setTimeout(
        () => predictionController.abort(),
        30000
      ); // 30 second timeout

      try {
        const predictionResp = await api.post<SalesLossPredictionResponse>(
          '/predict-sales-loss',
          {
            product_name: product,
            brand_name: brand,
            platform: 'YouTube',
            start_date: '2023-01-01',
            end_date: '2027-12-31',
          },
          { signal: predictionController.signal }
        );
        clearTimeout(predictionTimeoutId);
        setPrediction(predictionResp.data);
      } catch (predictionErr: any) {
        clearTimeout(predictionTimeoutId);
        if (predictionErr.name === 'AbortError') {
          throw new Error(
            'Prediction timeout - took too long. Please try again.'
          );
        }
        throw predictionErr;
      }
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
      {/* INPUT PANEL */}
      <div className="glass neon-border rounded-2xl p-5">
        <h2 className="text-2xl font-semibold text-white mb-4">
          Product Analysis (YouTube · Multi-Video)
        </h2>

        <div className="grid gap-3">
          <input
            value={product}
            onChange={e => {
              setProduct(e.target.value);
              localStorage.setItem('product_name', e.target.value);
            }}
            placeholder="Product name (used as YouTube search)"
            className="rounded-xl border border-cyan-500/30 bg-slate-950 px-3 py-2 text-white"
          />

          <input
            value={brand}
            onChange={e => {
              setBrand(e.target.value);
              localStorage.setItem('brand_name', e.target.value);
            }}
            placeholder="Brand name"
            className="rounded-xl border border-cyan-500/30 bg-slate-950 px-3 py-2 text-white"
          />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          We automatically analyze comments from multiple top-viewed YouTube
          videos related to the product.
        </p>

        <button
          onClick={submit}
          disabled={loading}
          className="btn-primary w-full py-4 text-lg font-bold rounded-xl shadow-lg shadow-cyan-500/20"
        >
          {loading ? 'Fetching & Analyzing...' : 'Run Analysis'}
        </button>

        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </div>

      {/* RESULTS PANEL */}
      <div className="glass neon-border rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-white">Results</h3>

        {loading && (
          <div className="mt-8">
            <DynamicLoader message="Analyzing sentiment..." size="md" />
          </div>
        )}

        {!loading && sentiment && prediction && (
          <div className="mt-4 space-y-3">
            <div className="bg-slate-900/70 rounded-xl p-3">
              <p className="text-cyan-200">Average Sentiment</p>
              <p className="text-2xl text-white">
                {sentiment.average_sentiment.toFixed(2)}
              </p>
              <p className="text-sm text-slate-300">
                {sentiment.total_posts} YouTube comments analyzed
              </p>
            </div>

            {/* Sales Loss Meter */}
            <div className="bg-gradient-to-br from-red-950/50 to-orange-950/50 rounded-xl p-4 border border-red-500/30">
              <div className="flex justify-between items-center mb-2">
                <p className="text-red-200 font-semibold">
                  Predicted Sales Loss
                </p>
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-bold ${
                    prediction.risk_level === 'High'
                      ? 'bg-red-600/80 text-white'
                      : prediction.risk_level === 'Medium'
                        ? 'bg-orange-600/80 text-white'
                        : 'bg-green-600/80 text-white'
                  }`}
                >
                  {prediction.risk_level} Risk
                </span>
              </div>

              {/* Percentage Display */}
              <p className="text-4xl text-white font-bold mb-3">
                {prediction.predicted_drop_percentage.toFixed(1)}%
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden mb-3">
                <div
                  className={`h-full transition-all ${
                    prediction.predicted_drop_percentage > 30
                      ? 'bg-red-500'
                      : prediction.predicted_drop_percentage > 15
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.min(prediction.predicted_drop_percentage, 40)}%`,
                  }}
                />
              </div>

              {/* Supporting Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <p className="text-slate-400">Loss Probability</p>
                  <p className="text-white font-semibold">
                    {(prediction.loss_probability * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-2">
                  <p className="text-slate-400">Confidence</p>
                  <p className="text-white font-semibold">
                    {(prediction.confidence * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Explanation */}
              <p className="mt-3 text-xs text-slate-300 italic">
                {prediction.explanation}
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="btn-ghost w-full rounded-xl py-3"
            >
              View Dashboard
            </button>

            <button
              onClick={() => navigate('/report')}
              className="btn-primary w-full rounded-xl py-3"
            >
              📊 View Detailed Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

# AI Sales Loss Prediction System

A full-stack application that analyzes YouTube video comments to predict sales impact and losses. The system combines sentiment analysis, machine learning models, and real-time data visualization to help businesses understand how customer sentiment affects their revenue.

## Overview

This application ingests comments from YouTube videos, performs sentiment analysis, runs predictive models to estimate potential sales losses, and provides an interactive dashboard with AI-powered insights. Features include real-time KPI tracking, sentiment-based filtering, predictive analytics, and a Gemini-powered chatbot for guidance.

## Tech Stack

**Backend:**

- FastAPI - Modern Python web framework
- SQLAlchemy - ORM for database operations
- scikit-learn - Machine learning models
- SQLite - Lightweight database
- YouTube Data API - Comment ingestion
- Gemini API - Chat and insights (optional)

**Frontend:**

- React 18 with TypeScript
- Vite - Fast build tool
- Tailwind CSS - Styling and responsive design
- Recharts - Data visualization
- Axios - HTTP client
- React Router - Navigation

## Prerequisites

- Python 3.8+ (for backend)
- Node.js 16+ (for frontend)
- YouTube Data API key (required)
- Gemini API key (optional, for chat features)

## Installation

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
# On Windows
python -m venv .venv
.venv\Scripts\activate

# On macOS/Linux
python -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Set up environment variables:

```bash
# On Windows
set YOUTUBE_API_KEY=your_youtube_api_key_here
set GEMINI_API_KEY=your_gemini_api_key_here  # optional

# On macOS/Linux
export YOUTUBE_API_KEY=your_youtube_api_key_here
export GEMINI_API_KEY=your_gemini_api_key_here  # optional
```

5. Start the development server:

```bash
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev -- --host --port 5173
```

4. Open your browser and navigate to `http://localhost:5173`

The frontend will automatically connect to the backend at `http://localhost:8000` (configurable via `VITE_API_URL` environment variable).

## Key Features

### Sentiment Analysis

- Analyzes YouTube comments for sentiment
- Filters comments by product, brand, or date range
- Provides real-time sentiment distribution

### Predictive Analytics

- Predicts potential sales loss percentage based on sentiment trends
- Calculates loss probability and risk levels
- Provides detailed explanations for predictions

### Dashboard & Visualization

- Interactive KPI cards showing key metrics
- Charts for sentiment trends and sales projections
- Real-time alerts for significant changes
- Comments viewer with sentiment-based filtering

### AI Chatbot

- Gemini-powered chatbot for insights and guidance
- Natural language responses to business questions
- Historical context awareness

### Model Explanation

- Visual breakdown of NLP and ML pipeline
- Transparent model decision-making

## API Endpoints

### Analysis

- `POST /analyze-sentiment` — Analyze comments for sentiment scores
- `POST /predict-sales-loss` — Predict sales loss based on sentiment

### Data Retrieval

- `GET /get-dashboard-data` — Get KPIs, charts, and alerts
- `GET /comments` — Retrieve comments with sentiment labels (filterable)

### Chat

- `POST /chat` — Send messages to Gemini chatbot (requires `GEMINI_API_KEY`)

## Frontend Pages

- **Landing** - Project overview and getting started guide
- **Analyze** - Input form for sentiment analysis and loss prediction
- **Dashboard** - Main analytics view with KPIs, charts, and insights
- **Comments** - Filterable comments table with sentiment tags
- **Model Explanation** - Visual explanation of NLP and ML models

## How It Works

1. **Data Collection** - System fetches comments from YouTube videos via the YouTube Data API
2. **Sentiment Analysis** - Comments are scored using heuristic sentiment analysis
3. **Prediction** - Machine learning models estimate sales impact:
   - Logistic Regression for loss probability
   - Linear Regression for revenue projection
4. **Visualization** - Results are displayed in an interactive dashboard
5. **Insights** - Gemini AI provides natural language recommendations

## Development Notes

- Mock data is bootstrapped on startup for testing and demonstration
- The application uses a lightweight SQLite database
- Dark mode with neon theme for modern UI
- Responsive design with loading skeletons and error handling
- CORS configured to allow frontend-backend communication

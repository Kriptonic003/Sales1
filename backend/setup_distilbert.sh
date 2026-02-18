#!/bin/bash
# Quick Setup Script for DistilBERT Implementation
# Run this script to automatically set up everything

echo "🚀 Starting DistilBERT Setup..."
echo ""

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.8+"
    exit 1
fi

echo "✓ Python found: $(python --version)"
echo ""

# Navigate to backend
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv .venv
    echo "✓ Virtual environment created"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies (this may take a few minutes)..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create .env file in backend/ directory with your API keys"
echo "   cp .env.example .env"
echo "2. Add YOUTUBE_API_KEY to .env"
echo "3. (Optional) Add GEMINI_API_KEY to .env"
echo "4. Start the backend:"
echo "   uvicorn main:app --reload --port 8000"
echo ""
echo "🎉 Your sentiment classifier is now DistilBERT-powered!"

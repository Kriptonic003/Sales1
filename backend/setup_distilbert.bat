@echo off
REM Quick Setup Script for DistilBERT Implementation (Windows)
REM Run this script to automatically set up everything

echo.
echo 🚀 Starting DistilBERT Setup...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+
    exit /b 1
)

echo ✓ Python found: 
python --version
echo.

REM Navigate to backend
cd /d "%~dp0"
cd backend

REM Create virtual environment if it doesn't exist
if not exist ".venv" (
    echo 📦 Creating virtual environment...
    python -m venv .venv
    echo ✓ Virtual environment created
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call .venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️  Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📥 Installing dependencies (this may take 10-15 minutes)...
pip install -r requirements.txt

echo.
echo ✅ Setup complete!
echo.
echo 📝 Next steps:
echo 1. Create .env file in backend\ directory with your API keys
echo    copy .env.example .env
echo 2. Add YOUTUBE_API_KEY to .env
echo 3. (Optional) Add GEMINI_API_KEY to .env
echo 4. Start the backend:
echo    uvicorn main:app --reload --port 8000
echo.
echo 5. Start frontend (in new terminal from root):
echo    cd frontend
echo    npm run dev -- --host --port 5173
echo.
echo 🎉 Your sentiment classifier is now DistilBERT-powered!
echo.
pause

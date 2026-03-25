@echo off
echo ==============================================
echo       Starting MarketScout Agent Setup
echo ==============================================

echo.
echo [1/2] Setting up Backend API (FastAPI)...
cd backend
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo Installing Python dependencies...
pip install -r requirements.txt
echo Starting FastAPI Backend Server on port 8000...
start cmd /k "title MarketScout Backend && call venv\Scripts\activate && uvicorn main:app --reload"
cd ..

echo.
echo [2/2] Setting up Frontend Web App (React/Vite)...
cd frontend
echo Installing NPM dependencies...
call npm install
echo Starting Vite Dev Server on port 5173...
start cmd /k "title MarketScout Frontend && npm run dev"
cd ..

echo.
echo ==============================================
echo Setup Complete! 
echo Frontend: http://localhost:5173
echo Backend API: http://localhost:8000/docs
echo ==============================================
pause

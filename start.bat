@echo off
echo ========================================
echo   AquaSense — Starting All Services
echo ========================================

echo [1/3] Starting Ollama (Mistral)...
start "Ollama" cmd /k "ollama serve"
timeout /t 3 /nobreak >nul

echo [2/3] Starting FastAPI Backend (port 8001)...
start "AquaSense Backend" cmd /k "cd /d %~dp0 && uvicorn api.main:app --reload --port 8001"
timeout /t 4 /nobreak >nul

echo [3/3] Starting React Frontend (port 5173)...
start "AquaSense Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo ========================================
echo   All services started.
echo   Backend:  http://localhost:8001/docs
echo   Frontend: http://localhost:5173
echo   Ollama:   http://localhost:11434
echo ========================================
pause

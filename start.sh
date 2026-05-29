#!/bin/bash
echo "========================================"
echo "  AquaSense — Starting All Services"
echo "========================================"

echo "[1/3] Starting Ollama..."
ollama serve &
sleep 3

echo "[2/3] Starting FastAPI Backend..."
uvicorn api.main:app --reload --port 8001 &
sleep 4

echo "[3/3] Starting React Frontend..."
cd frontend && npm run dev &

echo "========================================"
echo "  Backend:  http://localhost:8001/docs"
echo "  Frontend: http://localhost:5173"
echo "========================================"

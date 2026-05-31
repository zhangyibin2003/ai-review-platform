#!/bin/bash
set -e

echo "=========================================="
echo "  AI 课程智能复习平台 - 一键启动"
echo "=========================================="

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 not found. Please install Python 3.10+"
    exit 1
fi

# Use nvm if available to ensure Node 18+
if [ -f "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    source "$NVM_DIR/nvm.sh"
    nvm use 20 2>/dev/null || nvm use default 2>/dev/null || true
fi
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Start backend
echo ""
echo "[1/2] Starting backend server..."
cd "$PROJECT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "  Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
echo "  Installing Python dependencies..."
pip install -q -r requirements.txt

echo "  Starting FastAPI server on http://0.0.0.0:8000"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start frontend
echo ""
echo "[2/2] Starting frontend server..."
cd "$PROJECT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    echo "  Installing Node dependencies..."
    npm install
fi

echo "  Starting Next.js dev server on http://localhost:3000"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo "  Platform is starting!"
echo "  Frontend: http://localhost:3000"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "=========================================="
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo "All services stopped."
}
trap cleanup EXIT

wait

#!/bin/bash

# FSA Development Startup Script
# This script starts both the frontend and backend servers for development

echo "🚀 Starting FSA Development Environment..."
echo ""

# Check if we're in the right directory
if [ ! -d "apps/frontend" ] || [ ! -d "apps/backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected structure: apps/frontend/ and apps/backend/"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        return 0
    fi
}

# Check if ports are available
echo "🔍 Checking if ports are available..."
if ! check_port 3000; then
    echo "   Frontend port 3000 is busy. Please stop the process using it."
fi

if ! check_port 3001; then
    echo "   Backend port 3001 is busy. Please stop the process using it."
fi

echo ""

# Start backend server
echo "🔧 Starting Backend Server (Port 3001)..."
cd apps/backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend server
echo "🎨 Starting Frontend Server (Port 3000)..."
cd apps/frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Development servers started!"
echo ""
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo "📚 API Docs: http://localhost:3001/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for both processes
wait

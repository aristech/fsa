#!/bin/bash

# FSA Development Startup Script
# This script starts both the frontend and backend servers for development

echo "🚀 Starting FSA Development Environment..."
echo ""

# Get the script directory and ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || { echo "❌ Cannot change to script directory"; exit 1; }

# Check if we're in the right directory
if [ ! -d "apps/frontend" ] || [ ! -d "apps/backend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "   Expected structure: apps/frontend/ and apps/backend/"
    echo "   Current directory: $(pwd)"
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
PORT_BUSY=false

if ! check_port 3000; then
    echo "   ❌ Frontend port 3000 is busy. Please stop the process using it."
    PORT_BUSY=true
fi

if ! check_port 3001; then
    echo "   ❌ Backend port 3001 is busy. Please stop the process using it."
    PORT_BUSY=true
fi

if [ "$PORT_BUSY" = true ]; then
    echo ""
    echo "❌ Cannot start servers - ports are busy!"
    echo "   Please stop existing processes and try again."
    echo "   You can kill existing processes with:"
    echo "   pkill -f 'start-dev.sh'"
    echo "   pkill -f 'nodemon.*server'"
    exit 1
fi

echo "✅ All ports are available"
echo ""

# Start backend server
echo "🔧 Starting Backend Server (Port 3001)..."
cd "$(dirname "$0")/apps/backend" || { echo "❌ Cannot find apps/backend directory"; exit 1; }
npx nodemon --exec tsx src/server.ts &
BACKEND_PID=$!
cd - > /dev/null

# Wait a moment for backend to start and check if it's running
echo "⏳ Waiting for backend to start..."
sleep 5

if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start!"
    exit 1
fi

if ! lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null; then
    echo "❌ Backend is not listening on port 3001!"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend started successfully"

# Start frontend server
echo "🎨 Starting Frontend Server (Port 3000)..."
cd "$(dirname "$0")/apps/frontend" || { echo "❌ Cannot find apps/frontend directory"; exit 1; }
npx next dev -p 3000 --turbopack &
FRONTEND_PID=$!
cd - > /dev/null

# Wait for frontend to start and check if it's running
echo "⏳ Waiting for frontend to start (Next.js with Turbopack takes longer)..."
sleep 12

if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo "❌ Frontend failed to start!"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Wait a bit more for the port to be available
echo "⏳ Checking if frontend is listening on port 3000..."
for i in {1..10}; do
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
        break
    fi
    if [ $i -eq 10 ]; then
        echo "❌ Frontend is not listening on port 3000 after waiting!"
        kill $BACKEND_PID 2>/dev/null
        kill $FRONTEND_PID 2>/dev/null
        exit 1
    fi
    echo "   Still waiting... ($i/10)"
    sleep 2
done

echo "✅ Frontend started successfully"
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

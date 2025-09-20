#!/bin/bash

echo "🚀 Setting up FSA Local NLP Service..."

# Check Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3 and try again."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment
echo "🐍 Creating Python virtual environment..."
python3 -m venv nlp_env

# Activate virtual environment and install dependencies
echo "📦 Installing Python dependencies..."
source nlp_env/bin/activate
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Test the CLI tool
echo "🧪 Testing CLI tool..."
./nlp_env/bin/python main.py "create a task for testing"

if [ $? -eq 0 ]; then
    echo "✅ CLI tool working"
else
    echo "❌ CLI tool test failed"
    exit 1
fi

# Test the HTTP server
echo "🌐 Testing HTTP server..."
./nlp_env/bin/python server.py &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Test health endpoint
HEALTH_RESPONSE=$(curl -s http://localhost:8001/health)

if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
    echo "✅ HTTP server working"

    # Test processing endpoint
    echo "🧪 Testing processing endpoint..."
    curl -X POST "http://localhost:8001/process" \
         -H "Content-Type: application/json" \
         -d '{"text": "create task for garden maintenance"}' \
         -s | python3 -m json.tool

    echo "✅ Processing endpoint working"
else
    echo "❌ HTTP server test failed"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

# Stop test server
kill $SERVER_PID 2>/dev/null

echo ""
echo "🎉 Setup complete! Local NLP service is ready to use."
echo ""
echo "Usage:"
echo "  CLI: python3 main.py 'your text here'"
echo "  Server: python3 server.py"
echo "  Health check: curl http://localhost:8001/health"
echo ""
echo "The service will start automatically with your Node.js backend."
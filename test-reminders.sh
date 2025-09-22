#!/bin/bash

# Test script for reminder functionality
# This script tests the reminder system endpoints

echo "🔄 Testing Task Reminder System"
echo "================================"

# Check if backend is running
echo "1. Checking backend health..."
if curl -f http://localhost:4005/api/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not running. Please start the backend service first."
    exit 1
fi

echo ""
echo "2. Getting pending reminders..."
curl -s -X GET http://localhost:4005/api/v1/reminders/pending | jq '.'

echo ""
echo "3. Processing reminders..."
curl -s -X POST http://localhost:4005/api/v1/reminders/process | jq '.'

echo ""
echo "4. Testing manual reminder update for a task..."
echo "Note: Replace 'TASK_ID' with an actual task ID to test"
# curl -s -X POST http://localhost:4005/api/v1/reminders/update-task/TASK_ID | jq '.'

echo ""
echo "✅ Reminder system test completed!"
echo ""
echo "Usage tips:"
echo "- Create a task with a due date and reminder enabled to see it in action"
echo "- The cron job will run every 30 minutes automatically in production"
echo "- Check logs at /var/www/progressnet.io-app/logs/reminder-cron.log for cron status"
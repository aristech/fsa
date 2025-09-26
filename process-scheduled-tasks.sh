#!/bin/bash

# Script to process reminders and recurring tasks for cron jobs
# Run every 30 minutes: */30 * * * * /path/to/process-scheduled-tasks.sh

echo "🔄 Processing Scheduled Tasks - $(date)"
echo "======================================"

# Set your backend URL
BACKEND_URL="http://localhost:3001"

# Check if backend is running
echo "1. Checking backend health..."
if curl -f $BACKEND_URL/health >/dev/null 2>&1; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not running. Exiting."
    exit 1
fi

echo ""
echo "2. Processing reminders..."
REMINDER_RESULT=$(curl -s -X POST $BACKEND_URL/api/v1/reminders/process)
echo $REMINDER_RESULT | jq '.'

echo ""
echo "3. Processing recurring tasks..."
RECURRING_RESULT=$(curl -s -X POST $BACKEND_URL/api/v1/reminders/process-recurring)
echo $RECURRING_RESULT | jq '.'

echo ""
echo "✅ Scheduled task processing completed - $(date)"
echo ""
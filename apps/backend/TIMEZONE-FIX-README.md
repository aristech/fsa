# Timezone-Aware Reminder System Fix

## Problem Solved

The task reminder and recurring task system was not properly handling timezones, leading to reminders being sent at inconsistent and incorrect times.

### Original Issue
- **Frontend** shows task due date as 15:00 (user's local time - Europe/Athens)
- **Database** stores the date as 12:00 UTC (3 hours earlier)
- **User sets reminder** for "1 hour before" expecting 14:00 local time
- **Old system calculates** 12:00 UTC - 1 hour = 11:00 UTC
- **Reminders sent** at inconsistent times due to UTC-only calculations

## Solution Implemented

### New Timezone-Aware Services

1. **TimezoneAwareReminderService** (`src/services/timezone-aware-reminder-service.ts`)
   - Loads tenant timezone from database
   - Converts due dates to tenant timezone before calculating reminder times
   - Stores reminder times in UTC for consistent scheduling
   - Displays dates in local timezone in emails

2. **TimezoneAwareRecurringTaskService** (`src/services/timezone-aware-recurring-task-service.ts`)
   - Same timezone-aware approach for recurring tasks
   - Handles date shifts correctly across timezone boundaries
   - Maintains proper scheduling for daily/weekly/monthly tasks

### Key Improvements

#### Before (Problematic)
```typescript
// Old system - UTC only
const reminderTime = dayjs(taskDueDate).subtract(1, 'hour').toDate();
```

#### After (Timezone-Aware)
```typescript
// New system - timezone aware
const tenantTimezone = await getTenantTimezone(tenantId);
const dueDateInTenantTz = dayjs(taskDueDate).tz(tenantTimezone);
const reminderTimeInTenantTz = dueDateInTenantTz.subtract(1, 'hour');
const reminderTimeUtc = reminderTimeInTenantTz.utc().toDate();
```

## Files Updated

### New Services
- `src/services/timezone-aware-reminder-service.ts`
- `src/services/timezone-aware-recurring-task-service.ts`

### Updated Routes
- `src/routes/reminders.ts` - Now uses timezone-aware services

### Updated Controllers
- `src/controllers/kanban.ts` - Task creation/update now uses timezone-aware services

### Test & Migration Scripts
- `src/scripts/test-timezone-reminders.ts` - Demonstrates timezone calculations
- `src/scripts/migrate-existing-reminders.ts` - Migrates existing tasks

## How It Works

### Reminder Calculation Process

1. **Load Tenant Timezone**: Query database for tenant's timezone setting
2. **Convert to Local Time**: Transform UTC due date to tenant's local time
3. **Calculate Reminder**: Subtract reminder period in local timezone
4. **Store in UTC**: Convert calculated reminder time back to UTC for storage
5. **Schedule Consistently**: Cron jobs work with UTC times for consistency

### Example Flow

```
Task due at 15:00 Europe/Athens, 1-hour reminder:

1. Frontend displays: 15:00 (local time)
2. Database stores: 13:00 UTC
3. User sets: "1 hour before"
4. System calculates:
   - Due time in local: 15:00 Europe/Athens
   - Reminder in local: 14:00 Europe/Athens
   - Reminder in UTC: 12:00 UTC (for storage)
5. Cron fires at: 12:00 UTC = 14:00 local time ✅
```

## Email Improvements

Emails now show times in the user's local timezone:
- Due dates formatted as "Jan 15, 2024 at 3:00 PM EET"
- Timezone indicator in email footer
- Consistent local time display

## Deployment Instructions

### 1. Deploy Code
Deploy the updated backend code with the new timezone-aware services.

### 2. Run Migration (Optional)
To update existing tasks with correct timezone calculations:

```bash
# Test migration first
npx tsx src/scripts/migrate-existing-reminders.ts --dry-run

# Run actual migration
npx tsx src/scripts/migrate-existing-reminders.ts
```

### 3. Update Scheduled Tasks
The existing cron job script (`process-scheduled-tasks.sh`) will automatically use the new timezone-aware services via the updated endpoints.

### 4. Verify Operation

Test the reminder endpoints:
```bash
# Process reminders
curl -X POST http://localhost:4005/api/v1/reminders/process

# Process recurring tasks
curl -X POST http://localhost:4005/api/v1/reminders/process-recurring
```

## Testing

### Test Script
Run the timezone calculation test:
```bash
npx tsx src/scripts/test-timezone-reminders.ts
```

### Debug Endpoints
- `GET /api/v1/reminders/pending` - See pending reminders
- `GET /api/v1/reminders/debug-reminder/:taskId` - Debug specific task
- `GET /api/v1/reminders/debug-emails/:taskId` - Check email recipients

## Benefits

✅ **Accurate Timing**: Reminders fire at exactly the expected local time
✅ **Timezone Support**: Proper handling of different timezones
✅ **DST Compatibility**: Correctly handles daylight saving time changes
✅ **User Experience**: Emails show local times with timezone indicators
✅ **Consistency**: All reminder calculations use the same timezone-aware logic
✅ **Backward Compatible**: Existing tasks continue to work

## Technical Notes

- Uses `dayjs` with `timezone` and `utc` plugins
- Tenant timezone stored in `Tenant.timezone` field (defaults to "Europe/Athens")
- All UTC times stored in database for consistent scheduling
- Cron job continues to run every 30 minutes as before
- No frontend changes required - times already handled correctly there

## Monitoring

Watch the logs during reminder processing to see timezone-aware calculations:
```
📅 Timezone-aware reminder calculation:
  Tenant: 668d93e9ee9cf5664de732521 (Europe/Athens)
  Due date UTC: 2024-01-15T13:00:00Z
  Due date in tenant TZ: 2024-01-15 15:00:00 +02:00
  Reminder type: 1hour
  Reminder time in tenant TZ: 2024-01-15 14:00:00 +02:00
  Reminder time UTC (stored): 2024-01-15T12:00:00Z
```
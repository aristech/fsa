#!/usr/bin/env node
/**
 * Test script for timezone-aware reminder calculations
 *
 * This script demonstrates how the new timezone-aware reminder system
 * properly calculates reminder times in the user's local timezone.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

// Enable dayjs timezone plugins
dayjs.extend(utc);
dayjs.extend(timezone);

// Mock tenant timezone (could be loaded from database)
const TENANT_TIMEZONE = 'Europe/Athens'; // GMT+2 (or GMT+3 during DST)

console.log('🔧 Testing Timezone-Aware Reminder Calculations\n');

// Test scenarios
const testScenarios = [
  {
    name: 'Task due at 15:00 local time (Greece)',
    localDueTime: '2024-01-15 15:00',
    reminderType: '1hour',
    expectedLocalReminder: '2024-01-15 14:00'
  },
  {
    name: 'Task due at 09:00 local time (Greece)',
    localDueTime: '2024-01-15 09:00',
    reminderType: '1day',
    expectedLocalReminder: '2024-01-14 09:00'
  },
  {
    name: 'Recurring daily task at 16:30 local time',
    localDueTime: '2024-01-15 16:30',
    reminderType: '1hour',
    expectedLocalReminder: '2024-01-15 15:30'
  }
];

function calculateReminderTime(localDueTime: string, reminderType: string): {
  dueUtc: string;
  dueLocal: string;
  reminderUtc: string;
  reminderLocal: string;
} {
  // Parse the due time as local time in tenant timezone
  const dueLocal = dayjs.tz(localDueTime, TENANT_TIMEZONE);

  // Convert to UTC for storage
  const dueUtc = dueLocal.utc();

  // Calculate reminder time in local timezone
  let reminderLocal: dayjs.Dayjs;
  switch (reminderType) {
    case '1hour':
      reminderLocal = dueLocal.subtract(1, 'hour');
      break;
    case '1day':
      reminderLocal = dueLocal.subtract(1, 'day');
      break;
    case '1week':
      reminderLocal = dueLocal.subtract(1, 'week');
      break;
    default:
      reminderLocal = dueLocal.subtract(1, 'hour');
  }

  // Convert reminder time to UTC for storage/scheduling
  const reminderUtc = reminderLocal.utc();

  return {
    dueUtc: dueUtc.format('YYYY-MM-DD HH:mm:ss [UTC]'),
    dueLocal: dueLocal.format('YYYY-MM-DD HH:mm:ss z'),
    reminderUtc: reminderUtc.format('YYYY-MM-DD HH:mm:ss [UTC]'),
    reminderLocal: reminderLocal.format('YYYY-MM-DD HH:mm:ss z')
  };
}

console.log(`🌍 Testing with tenant timezone: ${TENANT_TIMEZONE}`);
console.log(`📅 Current time: ${dayjs().format()} (${dayjs().tz(TENANT_TIMEZONE).format('z')})\n`);

testScenarios.forEach((scenario, index) => {
  console.log(`${index + 1}. ${scenario.name}`);
  console.log(`   Reminder type: ${scenario.reminderType}`);

  const result = calculateReminderTime(scenario.localDueTime, scenario.reminderType);

  console.log(`   📋 Due time (local):    ${result.dueLocal}`);
  console.log(`   📋 Due time (UTC):      ${result.dueUtc}`);
  console.log(`   🔔 Reminder (local):    ${result.reminderLocal}`);
  console.log(`   🔔 Reminder (UTC):      ${result.reminderUtc}`);

  // Calculate when the reminder should actually fire
  const reminderUtcTime = dayjs.utc(result.reminderUtc.replace(' UTC', ''));
  const currentUtc = dayjs.utc();

  if (reminderUtcTime.isAfter(currentUtc)) {
    const timeUntil = reminderUtcTime.diff(currentUtc, 'minute');
    console.log(`   ⏰ Reminder fires in:   ${timeUntil} minutes`);
  } else {
    const timePassed = currentUtc.diff(reminderUtcTime, 'minute');
    console.log(`   ⏰ Reminder was due:    ${timePassed} minutes ago`);
  }

  console.log('');
});

// Demonstrate the problem with old system
console.log('❌ OLD SYSTEM PROBLEM:');
console.log('   Frontend shows: 15:00 Europe/Athens');
console.log('   Database stores: 13:00 UTC (correct)');
console.log('   User sets: "1 hour before" expecting 14:00 local time');
console.log('   Old system calculates: 13:00 UTC - 1 hour = 12:00 UTC');
console.log('   12:00 UTC = 14:00 Europe/Athens ✅ (accidentally correct)');
console.log('   BUT cron runs every 30 minutes, so timing is inconsistent!\n');

console.log('✅ NEW SYSTEM SOLUTION:');
console.log('   Frontend shows: 15:00 Europe/Athens');
console.log('   Database stores: 13:00 UTC (correct)');
console.log('   User sets: "1 hour before" expecting 14:00 local time');
console.log('   New system:');
console.log('     1. Loads tenant timezone: Europe/Athens');
console.log('     2. Converts due date to local: 15:00 Europe/Athens');
console.log('     3. Subtracts 1 hour in local time: 14:00 Europe/Athens');
console.log('     4. Converts back to UTC: 12:00 UTC');
console.log('     5. Stores reminder time: 12:00 UTC');
console.log('   ✅ Reminder fires at exactly 14:00 local time!');

console.log('\n🔧 Implementation Benefits:');
console.log('   • Timezone-aware calculations');
console.log('   • Consistent reminder timing');
console.log('   • Handles daylight saving time changes');
console.log('   • User-friendly local time display in emails');
console.log('   • Backward compatible with existing tasks');
import assert from 'node:assert';
import { CalendarDate } from '@internationalized/date';
import {
  daysInRange,
  swapIfReversed,
  getPreviousPeriod,
  getWeekBoundaries,
  convertSlotTimezone,
  formatRangeDisplay,
} from '../src/utils/dateMath.ts';

console.log('--- Running Range Math & Timezone Unit Tests ---');

// Test 1: Inclusive Days
{
  const start = new CalendarDate(2026, 10, 7);
  const end = new CalendarDate(2026, 11, 5);
  const days = daysInRange(start, end);
  assert.strictEqual(days, 30, `Expected 30 days inclusive from Oct 7 to Nov 5, got ${days}`);
  console.log('✓ Test 1: Inclusive days calculation passed (30 days)');

  const singleDay = daysInRange(new CalendarDate(2026, 11, 5), new CalendarDate(2026, 11, 5));
  assert.strictEqual(singleDay, 1, `Expected 1 day for same start and end, got ${singleDay}`);
  console.log('✓ Test 1b: Single day inclusive count passed (1 day)');
}

// Test 2: Swap on Reverse Pick
{
  const start = new CalendarDate(2026, 11, 5);
  const end = new CalendarDate(2026, 10, 7);
  const swapped = swapIfReversed(start, end);
  assert.strictEqual(swapped.start.toString(), '2026-10-07', 'Expected start to be Oct 7 after swap');
  assert.strictEqual(swapped.end.toString(), '2026-11-05', 'Expected end to be Nov 5 after swap');
  console.log('✓ Test 2: Swap on reverse pick passed (swapped Oct 7 and Nov 5)');

  // Already ordered
  const ordered = swapIfReversed(new CalendarDate(2026, 10, 7), new CalendarDate(2026, 11, 5));
  assert.strictEqual(ordered.start.toString(), '2026-10-07');
  assert.strictEqual(ordered.end.toString(), '2026-11-05');
  console.log('✓ Test 2b: Preserves already ordered range');
}

// Test 3: Previous Period Calculation
{
  const start = new CalendarDate(2026, 10, 7);
  const end = new CalendarDate(2026, 11, 5);
  const prev = getPreviousPeriod(start, end);
  assert.strictEqual(prev.days, 30, 'Expected prev period to have 30 days');
  assert.strictEqual(prev.end.toString(), '2026-10-06', 'Expected prev period end to be Oct 6');
  assert.strictEqual(prev.start.toString(), '2026-09-07', 'Expected prev period start to be Sep 7');
  console.log('✓ Test 3: Equal-length previous period passed (Sep 7 - Oct 6, 30 days)');

  // 7 days test
  const start7 = new CalendarDate(2026, 10, 30);
  const end7 = new CalendarDate(2026, 11, 5);
  const prev7 = getPreviousPeriod(start7, end7);
  assert.strictEqual(prev7.days, 7, 'Expected 7 days');
  assert.strictEqual(prev7.end.toString(), '2026-10-29', 'Expected prev end to be Oct 29');
  assert.strictEqual(prev7.start.toString(), '2026-10-23', 'Expected prev start to be Oct 23');
  console.log('✓ Test 3b: Previous 7-day period passed (Oct 23 - Oct 29, 7 days)');
}

// Test 4: Week Boundaries
{
  // 2026-11-05 is a Thursday
  const d = new CalendarDate(2026, 11, 5);
  const week = getWeekBoundaries(d);
  assert.strictEqual(week.start.toString(), '2026-11-02', 'Expected Monday to be Nov 2');
  assert.strictEqual(week.end.toString(), '2026-11-08', 'Expected Sunday to be Nov 8');
  console.log('✓ Test 4: Week boundaries passed (Mon Nov 2 - Sun Nov 8)');

  // Monday itself
  const mon = new CalendarDate(2026, 11, 2);
  const weekMon = getWeekBoundaries(mon);
  assert.strictEqual(weekMon.start.toString(), '2026-11-02');
  assert.strictEqual(weekMon.end.toString(), '2026-11-08');
  console.log('✓ Test 4b: Week boundary starting on Monday passed');
}

// Test 5: Timezone Slot Conversion Across a Date Line
{
  // Slot at 02:00 AM in Asia/Kolkata (+05:30) on 2026-11-05 (minutes = 120).
  // In UTC, this is 2026-11-04 20:30 UTC.
  // In America/New_York (UTC-5), this is 2026-11-04 15:30 (3:30 PM on the PREVIOUS day).
  const date = new CalendarDate(2026, 11, 5);
  const slotMinutes = 2 * 60; // 02:00 AM
  const convertedNY = convertSlotTimezone(date, slotMinutes, 'America/New_York', false);
  assert.strictEqual(convertedNY.isCrossDateLine, true, 'Expected slot to cross date line into previous day');
  assert.strictEqual(convertedNY.displayDateString, '4/11/2026', 'Expected target date to be 4 Nov 2026');
  assert.match(convertedNY.timeString, /3:30\s*PM/, 'Expected 3:30 PM in NY');
  console.log('✓ Test 5: Timezone conversion crossing date line backwards passed (Kolkata 02:00 -> NY 3:30 PM prev day)');

  // Slot at 22:30 PM in Asia/Kolkata on 2026-11-05 (minutes = 1350).
  // In Asia/Tokyo (+09:00), this is 3.5 hours later -> 02:00 AM on 2026-11-06 (NEXT day).
  const convertedTokyo = convertSlotTimezone(date, 22 * 60 + 30, 'Asia/Tokyo', true);
  assert.strictEqual(convertedTokyo.isCrossDateLine, true, 'Expected slot to cross date line into next day');
  assert.strictEqual(convertedTokyo.displayDateString, '6/11/2026', 'Expected target date to be 6 Nov 2026 in Tokyo');
  assert.match(convertedTokyo.timeString, /02:00|2:00/, 'Expected 02:00 in Tokyo');
  console.log('✓ Test 5b: Timezone conversion crossing date line forwards passed (Kolkata 22:30 -> Tokyo 02:00 next day)');
}

console.log('\nAll 5 Unit Test Suites Passed Successfully!');

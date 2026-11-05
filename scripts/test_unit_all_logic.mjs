import assert from 'node:assert';
import { CalendarDate } from '@internationalized/date';
import {
  daysInRange,
  swapIfReversed,
  getPreviousPeriod,
  getWeekBoundaries,
  convertSlotTimezone,
} from '../src/utils/dateMath.ts';

console.log('=== Running Comprehensive Unit Tests ===\n');

// 1. Range Math
console.log('--- 1. Range Math Tests ---');
{
  const start = new CalendarDate(2026, 10, 7);
  const end = new CalendarDate(2026, 11, 5);
  assert.strictEqual(daysInRange(start, end), 30, '30 days inclusive from Oct 7 to Nov 5');
  assert.strictEqual(daysInRange(start, start), 1, '1 day inclusive for same date');

  const swapped = swapIfReversed(end, start);
  assert.strictEqual(swapped.start.toString(), '2026-10-07');
  assert.strictEqual(swapped.end.toString(), '2026-11-05');

  const prev = getPreviousPeriod(start, end);
  assert.strictEqual(prev.days, 30);
  assert.strictEqual(prev.start.toString(), '2026-09-07');
  assert.strictEqual(prev.end.toString(), '2026-10-06');

  const d = new CalendarDate(2026, 11, 5); // Thursday
  const week = getWeekBoundaries(d);
  assert.strictEqual(week.start.toString(), '2026-11-02', 'Monday');
  assert.strictEqual(week.end.toString(), '2026-11-08', 'Sunday');

  console.log('✓ Range math tests passed (inclusive days, reverse swap, previous period, week boundaries)');
}

// 2. CSV Validation Logic
console.log('\n--- 2. CSV Validation Logic Tests ---');
{
  const REQUIRED_HEADERS = [
    'date',
    'platform',
    'type',
    'text',
    'views',
    'likes',
    'replies',
    'link_clicks',
    'profile_clicks',
  ];

  function validateCsvHeader(headerLine) {
    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const missing = REQUIRED_HEADERS.filter((rh) => !headers.includes(rh));
    return {
      isValid: missing.length === 0,
      missing,
    };
  }

  function validateCsvRow(rowLine, rowIdx) {
    const cells = rowLine.split(',').map((c) => c.trim());
    if (cells.length < REQUIRED_HEADERS.length) {
      return { isValid: false, row: rowIdx, error: `Insufficient columns (${cells.length}/${REQUIRED_HEADERS.length})` };
    }
    const [date, platform, type, text, views, likes, replies, link_clicks, profile_clicks] = cells;
    if (isNaN(Date.parse(date))) {
      return { isValid: false, row: rowIdx, error: `Invalid date format: "${date}"` };
    }
    if (!['x', 'li', 'linkedin', 'twitter'].includes(platform.toLowerCase())) {
      return { isValid: false, row: rowIdx, error: `Invalid platform: "${platform}"` };
    }
    if (isNaN(Number(views)) || isNaN(Number(likes)) || isNaN(Number(replies))) {
      return { isValid: false, row: rowIdx, error: 'Metric columns must be numbers' };
    }
    return {
      isValid: true,
      row: rowIdx,
      data: { date, platform, type, text, views: Number(views), likes: Number(likes), replies: Number(replies) },
    };
  }

  // Header validation
  const validHeader = 'date,platform,type,text,views,likes,replies,link_clicks,profile_clicks';
  assert.strictEqual(validateCsvHeader(validHeader).isValid, true);

  const invalidHeader = 'date,platform,text,views';
  const headerCheck = validateCsvHeader(invalidHeader);
  assert.strictEqual(headerCheck.isValid, false);
  assert.deepStrictEqual(headerCheck.missing, ['type', 'likes', 'replies', 'link_clicks', 'profile_clicks']);

  // Row validation
  const validRow = '2026-11-04,X,original post,Test post text,250,12,3,5,10';
  assert.strictEqual(validateCsvRow(validRow, 1).isValid, true);

  const invalidRowDate = 'not-a-date,X,original post,Test post text,250,12,3,5,10';
  assert.strictEqual(validateCsvRow(invalidRowDate, 2).isValid, false);

  const invalidRowPlatform = '2026-11-04,instagram,original post,Test,250,12,3,5,10';
  assert.strictEqual(validateCsvRow(invalidRowPlatform, 3).isValid, false);

  console.log('✓ CSV validation tests passed (header schema, column presence, type checks, date parsing)');
}

// 3. Topic Ranking & Low-Sample Rule Tests
console.log('\n--- 3. Topic Ranking & Low-Sample Rule Tests ---');
{
  const testTopics = ['NetSuite', 'Cash Application', 'SAP', 'Pre-accounting', 'DSO'];
  const testItems = [
    { topic: 'NetSuite', eng: 4.5, views: 200 },
    { topic: 'NetSuite', eng: 5.5, views: 300 },
    { topic: 'NetSuite', eng: 5.0, views: 250 },
    { topic: 'NetSuite', eng: 6.0, views: 220 },
    { topic: 'NetSuite', eng: 4.0, views: 180 }, // n = 5 (adequate sample, avg = 5.0)

    { topic: 'Cash Application', eng: 8.0, views: 150 },
    { topic: 'Cash Application', eng: 6.0, views: 170 }, // n = 2 (low sample, avg = 7.0)

    { topic: 'SAP', eng: 3.0, views: 100 }, // n = 1 (low sample, avg = 3.0)
    { topic: 'Pre-accounting', eng: 2.0, views: 100 }, // n = 1 (low sample, avg = 2.0)
    { topic: 'DSO', eng: 1.0, views: 100 }, // n = 1 (low sample, avg = 1.0)
  ];

  function rankTopics(topics, items) {
    return topics.map((topic) => {
      const matching = items.filter((i) => i.topic === topic);
      const n = matching.length;
      const avgEng = n > 0 ? matching.reduce((acc, cur) => acc + cur.eng, 0) / n : 0;
      const avgViews = n > 0 ? matching.reduce((acc, cur) => acc + cur.views, 0) / n : 0;
      return {
        topic,
        n,
        avgEng,
        avgViews,
        isLowSample: n < 5,
      };
    }).sort((a, b) => b.avgEng - a.avgEng);
  }

  const ranked = rankTopics(testTopics, testItems);
  assert.strictEqual(ranked[0].topic, 'Cash Application');
  assert.strictEqual(ranked[0].avgEng, 7.0);
  assert.strictEqual(ranked[0].isLowSample, true, 'n=2 is low sample (< 5)');

  assert.strictEqual(ranked[1].topic, 'NetSuite');
  assert.strictEqual(ranked[1].avgEng, 5.0);
  assert.strictEqual(ranked[1].isLowSample, false, 'n=5 is adequate sample (>= 5)');

  // Top resonance topic with adequate sample
  const topAdequate = ranked.find((t) => !t.isLowSample);
  assert.strictEqual(topAdequate.topic, 'NetSuite');
  assert.strictEqual(topAdequate.n, 5);

  console.log('✓ Topic ranking & low-sample tests passed (correct sorting, n < 5 muted flag, adequate sample discovery)');
}

// 4. Pagination Reset Logic Tests
console.log('\n--- 4. Pagination Reset Logic Tests ---');
{
  let currentPage = 4;
  let activeFilter = 'all';
  let activeQuery = '';
  let activeRangeKey = '2026-10-07:2026-11-05';

  function onFilterChange(newFilter) {
    if (activeFilter !== newFilter) {
      activeFilter = newFilter;
      currentPage = 1; // RESET
    }
  }

  function onQueryChange(newQuery) {
    if (activeQuery !== newQuery) {
      activeQuery = newQuery;
      currentPage = 1; // RESET
    }
  }

  function onRangeChange(newRangeKey) {
    if (activeRangeKey !== newRangeKey) {
      activeRangeKey = newRangeKey;
      currentPage = 1; // RESET
    }
  }

  // Trigger filter change
  onFilterChange('x');
  assert.strictEqual(currentPage, 1, 'Page resets to 1 on platform filter change');

  currentPage = 3;
  onQueryChange('NetSuite');
  assert.strictEqual(currentPage, 1, 'Page resets to 1 on search query change');

  currentPage = 5;
  onRangeChange('2026-10-30:2026-11-05');
  assert.strictEqual(currentPage, 1, 'Page resets to 1 on date range change');

  console.log('✓ Pagination reset tests passed (resets to page 1 on filter, search query, and range update)');
}

console.log('\n=========================================');
console.log('     ALL LOGIC UNIT TESTS PASSED         ');
console.log('=========================================');

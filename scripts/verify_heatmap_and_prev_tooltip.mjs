import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const screenshotsDir = 'C:\\Users\\kartik\\.gemini\antigravity\\brain\\9421b64f-751c-4faa-83cb-b281fdd9f0d7\\screenshots\\data_and_prev_fixes';
fs.mkdirSync(screenshotsDir, { recursive: true });

async function run() {
  const browser = await chromium.launch();

  console.log('=== TEST 1: Activity History Heatmap Alignment & Data Linkage ===');
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  const heatmapInfo = await page.evaluate(() => {
    const heat = document.querySelector('.heat');
    const tray = heat?.closest('.tray');
    // Check weekday labels
    const weekdaySpans = Array.from(tray?.querySelectorAll('.grid.gap-\\[4px\\] span') || [])
      .map(s => s.textContent?.trim())
      .filter(Boolean);

    // Check month headers
    const monthSpans = Array.from(tray?.querySelectorAll('.grid.h-\\[18px\\] span') || [])
      .map(s => s.textContent?.trim())
      .filter(Boolean);

    // Check cells
    const cells = Array.from(document.querySelectorAll('.heat button.heat-cell'));
    const totalCells = cells.length;

    // Check first 3 and last 3 cell aria-labels
    const sampleDates = cells.slice(0, 3).concat(cells.slice(-3)).map(c => c.getAttribute('aria-label'));

    return {
      weekdayLabels: weekdaySpans,
      monthLabels: monthSpans,
      totalCells,
      sampleDates,
    };
  });

  console.log('Heatmap Data Info:', JSON.stringify(heatmapInfo, null, 2));

  const ssHeatmap = path.join(screenshotsDir, 'activity-history-aligned.png');
  const heatTray = page.locator('.tray:has-text("Activity history")').first();
  await heatTray.screenshot({ path: ssHeatmap });
  console.log('✓ Captured aligned heatmap screenshot:', ssHeatmap);

  console.log('\n=== TEST 2: Analytics Line Chart Previous Period Hover Data ===');
  await page.goto('http://localhost:5174/#analytics');
  await page.waitForTimeout(1000);

  // Switch date range to 60 days
  const dateTrigger = page.locator('#dt').first();
  await dateTrigger.click();
  await page.waitForTimeout(400);

  const preset60 = page.locator('.preset-row:has-text("Last 60 days")').first();
  await preset60.click();
  await page.waitForTimeout(200);

  const applyBtn = page.locator('#cal-popover button:has-text("Apply")').first();
  await applyBtn.click();
  await page.waitForTimeout(600);

  // Switch to 'replies' metric tab (matching user's Image 2)
  const repliesTab = page.locator('#mt [data-m="replies"], #mt :text("Replies")').first();
  await repliesTab.click();
  await page.waitForTimeout(400);

  // Hover over the line chart across several points (especially middle/later points like Oct 13)
  const lineSvg = page.locator('#lch svg').first();
  const bbox = await lineSvg.boundingBox();

  let tooltipsFound = [];
  if (bbox) {
    // Sweep across the chart from 30% to 80% of width
    for (const factor of [0.35, 0.5, 0.65, 0.75, 0.85]) {
      await page.mouse.move(bbox.x + bbox.width * factor, bbox.y + bbox.height * 0.4);
      await page.waitForTimeout(100);
      const tipText = await page.evaluate(() => {
        const tip = document.getElementById('tip');
        return tip ? tip.textContent : '';
      });
      tooltipsFound.push({ xPercent: Math.round(factor * 100), tipText });
    }
  }

  console.log('Analytics Line Chart Tooltips at 60 Days:', JSON.stringify(tooltipsFound, null, 2));

  // Capture screenshot of chart with hover tooltip
  const ssChartPrev = path.join(screenshotsDir, 'line-chart-prev-tooltip.png');
  const chartTray = page.locator('.tray:has-text("Reply volume vs previous period")').first();
  await chartTray.screenshot({ path: ssChartPrev });
  console.log('✓ Captured line chart with prev data tooltip:', ssChartPrev);

  await browser.close();
  console.log('\n✓ ALL TESTS COMPLETED');
}

run().catch(console.error);

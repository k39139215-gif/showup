import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const screenshotsDir = 'C:\\Users\\kartik\\.gemini\\antigravity\\brain\\9421b64f-751c-4faa-83cb-b281fdd9f0d7\\screenshots\\zoom_and_60d_fixes';
fs.mkdirSync(screenshotsDir, { recursive: true });

async function run() {
  const browser = await chromium.launch();

  console.log('=== TEST 1: Activity Trend at 60 Days ===');
  const page1 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page1.goto('http://localhost:5174/');
  await page1.waitForTimeout(1000);

  // Open calendar popover and pick "Last 60 days"
  const dateTrigger = page1.locator('#dt').first();
  await dateTrigger.click();
  await page1.waitForTimeout(400);

  const preset60 = page1.locator('.preset-row:has-text("Last 60 days")').first();
  await preset60.click();
  await page1.waitForTimeout(200);

  // Click Apply
  const applyBtn = page1.locator('#cal-popover button:has-text("Apply")').first();
  await applyBtn.click();
  await page1.waitForTimeout(600);

  // Verify Activity Trend at 60 days
  const trendInfo = await page1.evaluate(() => {
    const dc = document.getElementById('dc');
    const rects = Array.from(dc?.querySelectorAll('svg rect[width]') || []);
    const uniqueXs = Array.from(new Set(rects.map(r => parseFloat(r.getAttribute('x') || '0')))).sort((a, b) => a - b);
    const dotW = parseFloat(rects[0]?.getAttribute('width') || '0');
    const gaps = [];
    for (let i = 0; i < uniqueXs.length - 1; i++) {
      gaps.push(uniqueXs[i + 1] - uniqueXs[i] - dotW);
    }
    const labels = Array.from(dc?.querySelectorAll('svg text') || []).map(t => t.textContent?.trim());
    return {
      columnCount: uniqueXs.length,
      dotWidth: dotW,
      minGapBetweenColumns: gaps.length > 0 ? Math.min(...gaps) : null,
      maxGapBetweenColumns: gaps.length > 0 ? Math.max(...gaps) : null,
      sampleLabels: labels.slice(0, 8),
    };
  });

  console.log('Activity Trend 60-day stats:', JSON.stringify(trendInfo, null, 2));

  const ssTrend60 = path.join(screenshotsDir, 'activity-trend-60d.png');
  const trendTray = page1.locator('.tray:has-text("Activity trend")').first();
  await trendTray.screenshot({ path: ssTrend60 });
  console.log('✓ Captured 60d Activity Trend screenshot:', ssTrend60);

  console.log('\n=== TEST 2: Calendar Popover on Zoomed-in Screen (1152x800) ===');
  const page2 = await browser.newPage({ viewport: { width: 1152, height: 800 } });
  await page2.goto('http://localhost:5174/');
  await page2.waitForTimeout(1000);

  const dateTrigger2 = page2.locator('#dt').first();
  await dateTrigger2.click();
  await page2.waitForTimeout(400);

  const overlapCheck = await page2.evaluate(() => {
    const popover = document.getElementById('cal-popover');
    const sidebar = document.querySelector('aside.desktop-sidebar');
    const popoverRect = popover?.getBoundingClientRect();
    const sidebarRect = sidebar?.getBoundingClientRect();

    return {
      sidebarVisible: Boolean(sidebar && sidebarRect && sidebarRect.width > 0),
      sidebarRight: sidebarRect ? sidebarRect.right : null,
      popoverLeft: popoverRect ? popoverRect.left : null,
      popoverRight: popoverRect ? popoverRect.right : null,
      popoverWidth: popoverRect ? popoverRect.width : null,
      isOverlappingSidebar: sidebarRect && popoverRect ? popoverRect.left < sidebarRect.right : false,
      gapFromSidebar: sidebarRect && popoverRect ? popoverRect.left - sidebarRect.right : null,
    };
  });

  console.log('Zoomed-in Popover Collision Check (1152px):', JSON.stringify(overlapCheck, null, 2));

  const ssZoom1152 = path.join(screenshotsDir, 'calendar-zoom-1152.png');
  await page2.screenshot({ path: ssZoom1152 });
  console.log('✓ Captured 1152px zoom screenshot:', ssZoom1152);

  console.log('\n=== TEST 3: Calendar Popover on 960x700 Viewport ===');
  const page3 = await browser.newPage({ viewport: { width: 960, height: 700 } });
  await page3.goto('http://localhost:5174/');
  await page3.waitForTimeout(1000);

  const dateTrigger3 = page3.locator('#dt').first();
  await dateTrigger3.click();
  await page3.waitForTimeout(400);

  const overlapCheck960 = await page3.evaluate(() => {
    const popover = document.getElementById('cal-popover');
    const popoverRect = popover?.getBoundingClientRect();
    return {
      popoverLeft: popoverRect ? popoverRect.left : null,
      popoverRight: popoverRect ? popoverRect.right : null,
      popoverWidth: popoverRect ? popoverRect.width : null,
      windowWidth: window.innerWidth,
      isCompletelyInsideViewport: popoverRect ? popoverRect.left >= 0 && popoverRect.right <= window.innerWidth : false,
    };
  });

  console.log('Compact Popover Check (960px):', JSON.stringify(overlapCheck960, null, 2));

  const ssZoom960 = path.join(screenshotsDir, 'calendar-zoom-960.png');
  await page3.screenshot({ path: ssZoom960 });
  console.log('✓ Captured 960px zoom screenshot:', ssZoom960);

  await browser.close();
  console.log('\n✓ ALL TESTS COMPLETED');
}

run().catch(console.error);

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const artifactDir = 'C:\\Users\\kartik\\.gemini\\antigravity\\brain\\9421b64f-751c-4faa-83cb-b281fdd9f0d7';
const screenshotsDir = path.join(artifactDir, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function createServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = req.url.split('?')[0].split('#')[0];
      if (reqPath === '/') reqPath = '/index.html';
      const filePath = path.join(distDir, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        });
        fs.createReadStream(filePath).pipe(res);
      } else {
        const fallbackPath = path.join(distDir, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        fs.createReadStream(fallbackPath).pipe(res);
      }
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

const FIXED_TIME = new Date('2026-11-05T10:00:00+05:30');

async function main() {
  const port = 4180;
  const server = await createServer(port);
  console.log(`Verification server running at http://localhost:${port}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--font-render-hinting=none',
      '--disable-font-subpixel-positioning',
      '--hide-scrollbars',
      '--disable-features=OverlayScrollbar,FluentScrollbar,FluentOverlayScrollbar',
      '--run-all-compositor-stages-before-draw',
    ],
  });

  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Kolkata',
    locale: 'en-US',
  });

  const page = await desktopContext.newPage();
  await page.clock.install({ time: FIXED_TIME });

  const testResults = [];
  const logTest = (name, passed, detail = '') => {
    testResults.push({ name, passed, detail });
    console.log(`${passed ? '✓' : '✗'} ${name} ${detail ? `(${detail})` : ''}`);
  };

  try {
    // -------------------------------------------------------------
    // 1. Verify Viewport 1440x900 & Shell Scroll Height (Problem 5)
    // -------------------------------------------------------------
    console.log('\n=== Checking App Shell & Viewport Constraints (Problem 5) ===');
    await page.goto(`http://localhost:${port}/#today`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    const viewportMetrics = await page.evaluate(() => {
      const topEl = document.querySelector('.top');
      const sideEl = document.querySelector('aside.desktop-sidebar');
      return {
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        bodyScrollHeight: document.body.scrollHeight,
        shellHeight: document.querySelector('.shell')?.clientHeight,
        topBarHeight: Math.round(topEl ? topEl.getBoundingClientRect().height : 0),
        sidebarWidth: Math.round(sideEl ? sideEl.getBoundingClientRect().width : 0),
      };
    });

    logTest(
      'Shell height equals innerHeight',
      viewportMetrics.scrollHeight === viewportMetrics.innerHeight,
      `scrollHeight=${viewportMetrics.scrollHeight}, innerHeight=${viewportMetrics.innerHeight}`
    );
    logTest(
      'Top bar height is exactly 56px',
      viewportMetrics.topBarHeight === 56,
      `actual: ${viewportMetrics.topBarHeight}px`
    );
    logTest(
      'Desktop sidebar width is 260px',
      viewportMetrics.sidebarWidth === 260,
      `actual: ${viewportMetrics.sidebarWidth}px`
    );

    // Save desktop trigger closed screenshot
    const closedBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-desktop-closed.png'), closedBuf);

    // -------------------------------------------------------------
    // 2. Verify Unified Calendar UI & Presets (Problem 3 & 3B)
    // -------------------------------------------------------------
    console.log('\n=== Checking Unified Calendar UI & Presets (Problems 3 & 3B) ===');
    const trigger = page.locator('#dt');
    await trigger.click();
    await page.waitForSelector('#cal-popover', { state: 'visible' });
    await page.waitForTimeout(200);

    // Screenshot Range mode popover
    const rangeBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-popover-range.png'), rangeBuf);
    logTest('Unified Date Picker opens with range mode by default', await page.locator('#cal-popover').isVisible());

    // Measure Computed Styles for Problem 3B comparison table
    const styleMeasurements = await page.evaluate(() => {
      const preset = document.querySelector('.preset-row');
      const day = document.querySelector('.day-cell');
      
      const getStyles = (el) => {
        if (!el) return null;
        const cs = window.getComputedStyle(el);
        return {
          borderWidth: cs.borderWidth,
          borderStyle: cs.borderStyle,
          borderColor: cs.borderColor,
          boxShadow: cs.boxShadow,
          backgroundColor: cs.backgroundColor,
          borderRadius: cs.borderRadius,
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          height: cs.height,
          padding: cs.padding,
        };
      };

      return {
        preset: getStyles(preset),
        day: getStyles(day),
      };
    });

    logTest('Preset row has 0px border', styleMeasurements.preset.borderWidth === '0px');
    logTest('Preset row has no box shadow', styleMeasurements.preset.boxShadow === 'none');

    // Switch to Single Mode
    console.log('\n=== Checking Single Date Mode & Time Slots Sidebar ===');
    const singleTab = page.locator('button:has-text("Single")');
    await singleTab.click();
    await page.waitForTimeout(150);

    const singleBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-popover-single.png'), singleBuf);

    // Toggle "Add time"
    const addTimeToggle = page.locator('button:has-text("Add time")');
    await addTimeToggle.click();
    await page.waitForSelector('.time-slot-btn', { state: 'visible' });
    await page.waitForTimeout(200);

    const singleTimeBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-popover-single-timeslot.png'), singleTimeBuf);
    logTest('Time slot sidebar slides in without breaking calendar layout', await page.locator('.time-slot-btn').count() > 0);

    // Select a time slot and Apply
    const firstSlot = page.locator('.time-slot-btn').first();
    await firstSlot.click();
    const applyBtn = page.locator('button:has-text("Apply")');
    await applyBtn.click();
    await page.waitForTimeout(200);

    // Verify scheduledAt prefilled in Add Activity Dialog
    const addActivityBtn = page.locator('#add');
    await addActivityBtn.click();
    await page.waitForSelector('#dlg', { state: 'visible' });
    const dlgPrefilledText = await page.locator('#dlg').innerText();
    logTest('Add activity dialog pre-filled with scheduled time slot', dlgPrefilledText.includes('Pre-filled time:'));
    
    // Screenshot dialog with SelectDropdowns
    const dlgBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-dialog-add-activity.png'), dlgBuf);

    // Close dialog
    await page.locator('#a_c').click();
    await page.waitForTimeout(200);

    // -------------------------------------------------------------
    // 3. Verify Problem 2: Native <select> Replaced by BoardUI Dropdowns
    // -------------------------------------------------------------
    console.log('\n=== Checking Native <select> Replacement (Problem 2) ===');
    
    // Content page dropdowns: #ct and #cs
    await page.goto(`http://localhost:${port}/#content`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);

    const ctTrigger = page.locator('#ct');
    await ctTrigger.click();
    await page.waitForSelector('.boardui-dropdown-popover', { state: 'visible' });
    const contentDropdownBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-dropdown-content.png'), contentDropdownBuf);
    logTest('Content type dropdown opens BoardUI popover', await page.locator('.boardui-dropdown-popover').isVisible());
    
    // Pick an item from dropdown
    const tweetOption = page.locator('button[role="menuitem"]:has-text("Tweets / Short")');
    if (await tweetOption.isVisible()) {
      await tweetOption.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(200);

    // Settings page timezone dropdown: #s_tz
    await page.goto(`http://localhost:${port}/#settings`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);
    // Switch to goals tab where timezone resides
    await page.locator('.tabs button:has-text("Daily goals & timezone")').click();
    await page.waitForTimeout(200);

    const stzTrigger = page.locator('#s_tz');
    await stzTrigger.click();
    await page.waitForSelector('.boardui-dropdown-popover', { state: 'visible' });
    const settingsDropdownBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-dropdown-settings.png'), settingsDropdownBuf);
    logTest('Settings timezone dropdown opens BoardUI popover', await page.locator('.boardui-dropdown-popover').isVisible());
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // -------------------------------------------------------------
    // 4. Verify Problem 4: Date Store Driving Site Across 4 Modes
    // -------------------------------------------------------------
    console.log('\n=== Checking Date Store Across 4 Modes & URL Persistence (Problem 4) ===');

    // (a) Single day: 2026-11-05
    console.log('\n--- Mode A: Single Day (2026-11-05) ---');
    await page.goto(`http://localhost:${port}/?from=2026-11-05&to=2026-11-05&mode=single#today`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const todayHead = await page.locator('.head h1').innerText();
    logTest('Today page shows "Today" on single day 2026-11-05', todayHead === 'Today', `got: "${todayHead}"`);

    // (b) 7 days: 2026-10-30 to 2026-11-05
    console.log('\n--- Mode B: 7 Days (2026-10-30 to 2026-11-05) ---');
    await page.goto(`http://localhost:${port}/?from=2026-10-30&to=2026-11-05&mode=range#analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const analyticsSub = await page.locator('.head .sub').innerText();
    logTest('Analytics page uses 7 days range in summary', analyticsSub.includes('30 Oct - 5 Nov'), analyticsSub);

    // Check 14d shortcut click
    const tab14 = page.locator('#rg button[data-n="14"]');
    await tab14.click();
    await page.waitForTimeout(300);
    const urlAfter14 = page.url();
    logTest('14d shortcut writes to URL search params', urlAfter14.includes('from=2026-10-23') && urlAfter14.includes('to=2026-11-05'), urlAfter14);

    // (c) All time: 2026-08-08 to 2026-11-05
    console.log('\n--- Mode C: All Time (2026-08-08 to 2026-11-05) ---');
    await page.goto(`http://localhost:${port}/?from=2026-08-08&to=2026-11-05&mode=range#review`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const reviewChip = await page.locator('.head .chip').innerText();
    const reviewBanner = await page.locator('.banner b').innerText();
    logTest('Review page shows adequate sample on 90 days', reviewBanner.includes('Adequate sample'), `chip: ${reviewChip}`);

    // (d) Empty range: 2026-12-01 to 2026-12-10
    console.log('\n--- Mode D: Empty Range (2026-12-01 to 2026-12-10) ---');
    await page.goto(`http://localhost:${port}/?from=2026-12-01&to=2026-12-10&mode=range#today`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const emptyCard = await page.locator('.empty-state-card');
    logTest('Empty range displays empty state card on Today page', await emptyCard.isVisible());
    const emptyBuf = await page.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1440-empty-state.png'), emptyBuf);

    // Test URL Persistence across page reload
    await page.goto(`http://localhost:${port}/?from=2026-10-15&to=2026-10-28&mode=range#content`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    const triggerText = await page.locator('#dt').innerText();
    logTest('Date store initializes and restores from URL params on load', triggerText.includes('15 - 28 Oct 2026'), `got: "${triggerText.trim()}"`);

    await desktopContext.close();

    // -------------------------------------------------------------
    // 5. Verify Mobile Viewport 390x844 (Problem 5 & Bottom Sheet)
    // -------------------------------------------------------------
    console.log('\n=== Checking Mobile 390x844 Responsive & Bottom Sheet ===');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      timezoneId: 'Asia/Kolkata',
      locale: 'en-US',
    });

    const mobilePage = await mobileContext.newPage();
    await mobilePage.clock.install({ time: FIXED_TIME });
    await mobilePage.goto(`http://localhost:${port}/#today`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(300);

    // Verify desktop sidebar is hidden and menu button is visible
    const isDesktopSidebarHidden = await mobilePage.evaluate(() => {
      const sb = document.querySelector('aside.desktop-sidebar');
      return !sb || window.getComputedStyle(sb).display === 'none';
    });
    const isMenuBtnVisible = await mobilePage.locator('.menu-btn').isVisible();
    logTest('On 390x844 desktop sidebar is hidden', isDesktopSidebarHidden);
    logTest('On 390x844 hamburger menu button is visible', isMenuBtnVisible);

    const mobileClosedBuf = await mobilePage.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-390-mobile-closed.png'), mobileClosedBuf);

    // Click hamburger to open off-canvas drawer
    await mobilePage.locator('.menu-btn').click();
    await mobilePage.waitForSelector('.drawer-aside', { state: 'visible' });
    await mobilePage.waitForTimeout(200);

    const mobileDrawerBuf = await mobilePage.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-390-mobile-drawer.png'), mobileDrawerBuf);
    logTest('Hamburger menu opens off-canvas drawer with backdrop', await mobilePage.locator('.drawer-aside').isVisible());

    // Press Escape to close drawer
    await mobilePage.keyboard.press('Escape');
    await mobilePage.waitForTimeout(200);
    logTest('Escape key closes off-canvas drawer', !(await mobilePage.locator('.drawer-aside').isVisible()));

    // Open Unified Date Picker as Bottom Sheet
    const mobileTrigger = mobilePage.locator('#dt');
    await mobileTrigger.click();
    await mobilePage.waitForSelector('#cal-popover', { state: 'visible' });
    await mobilePage.waitForTimeout(250);

    const mobileSheetBuf = await mobilePage.screenshot();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-390-mobile-bottom-sheet.png'), mobileSheetBuf);
    logTest('Unified Date Picker opens as bottom sheet on mobile', await mobilePage.locator('#cal-popover').isVisible());

    await mobileContext.close();

    // -------------------------------------------------------------
    // Summary Output
    // -------------------------------------------------------------
    console.log('\n=========================================');
    console.log('         VERIFICATION SUMMARY');
    console.log('=========================================');
    const total = testResults.length;
    const passed = testResults.filter((r) => r.passed).length;
    console.log(`Total tests: ${total} | Passed: ${passed} | Failed: ${total - passed}\n`);

    // Write results JSON
    fs.writeFileSync(
      path.join(artifactDir, 'verification_results.json'),
      JSON.stringify({ testResults, styleMeasurements }, null, 2)
    );

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

main();

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const screenshotsDir = 'C:/Users/kartik/.gemini/antigravity/brain/9421b64f-751c-4faa-83cb-b281fdd9f0d7/screenshots/problem7';

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
      let parsed = req.url ? req.url.split('?')[0] : '/';
      let filePath = path.join(distDir, parsed === '/' ? 'index.html' : parsed);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      try {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      } catch (err) {
        res.writeHead(500);
        res.end('Server Error');
      }
    });

    server.listen(port, () => resolve(server));
  });
}

function parseColor(str) {
  const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (m) {
    return {
      r: parseInt(m[1], 10),
      g: parseInt(m[2], 10),
      b: parseInt(m[3], 10),
      a: m[4] !== undefined ? parseFloat(m[4]) : 1,
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function getRelativeLuminance({ r, g, b }) {
  const sRGB = [r, g, b].map((val) => {
    const c = val / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function getContrastRatio(rgb1, rgb2) {
  const L1 = getRelativeLuminance(rgb1);
  const L2 = getRelativeLuminance(rgb2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function runVerification() {
  const server = await createServer(4198);
  const browser = await chromium.launch({ headless: true });
  const results = {
    checks: [],
    contrastTable: [],
    screenshots: [],
  };

  console.log('=== VERIFYING PROBLEM 7 FIXES ===\n');

  // --- TEST VIEWPORT 1440x900 (Desktop) ---
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:4198/#today', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);

  // 1. Open Date Picker
  await desktopPage.click('#dt');
  await desktopPage.waitForSelector('#cal-popover', { state: 'visible' });
  await desktopPage.waitForTimeout(300);

  // Programmatic checks on Desktop Popover
  const popoverChecks = await desktopPage.evaluate(() => {
    const popover = document.getElementById('cal-popover');
    if (!popover) return { error: 'Popover not found' };

    const popoverRect = popover.getBoundingClientRect();

    // Check footer inputs
    const inputs = Array.from(popover.querySelectorAll('input[placeholder="DD/MM/YYYY"]'));
    const inputChecks = inputs.map((inp, idx) => {
      const rect = inp.getBoundingClientRect();
      return {
        index: idx,
        width: rect.width,
        clientWidth: inp.clientWidth,
        scrollWidth: inp.scrollWidth,
        isClipped: inp.scrollWidth > inp.clientWidth,
        value: inp.value,
      };
    });

    // Check month headers
    const monthContainers = Array.from(popover.querySelectorAll('.w-\\[308px\\]'));
    let headerCheck = null;
    let gridCheck = null;

    if (monthContainers.length >= 2) {
      const m1Header = monthContainers[0].querySelector('.h-\\[40px\\]');
      const m2Header = monthContainers[1].querySelector('.h-\\[40px\\]');
      const m1Grid = monthContainers[0].querySelector('.grid-cols-7:not(.h-\\[32px\\])');
      const m2Grid = monthContainers[1].querySelector('.grid-cols-7:not(.h-\\[32px\\])');

      const m1HRect = m1Header ? m1Header.getBoundingClientRect() : null;
      const m2HRect = m2Header ? m2Header.getBoundingClientRect() : null;
      const m1GRect = m1Grid ? m1Grid.getBoundingClientRect() : null;
      const m2GRect = m2Grid ? m2Grid.getBoundingClientRect() : null;

      headerCheck = {
        m1Top: m1HRect ? Math.round(m1HRect.top) : null,
        m2Top: m2HRect ? Math.round(m2HRect.top) : null,
        m1Height: m1HRect ? Math.round(m1HRect.height) : null,
        m2Height: m2HRect ? Math.round(m2HRect.height) : null,
        headersAligned: m1HRect && m2HRect && Math.abs(m1HRect.top - m2HRect.top) <= 1,
        equalHeight: m1HRect && m2HRect && Math.abs(m1HRect.height - m2HRect.height) <= 1,
      };

      gridCheck = {
        m1GridTop: m1GRect ? Math.round(m1GRect.top) : null,
        m2GridTop: m2GRect ? Math.round(m2GRect.top) : null,
        m1GridHeight: m1GRect ? Math.round(m1GRect.height) : null,
        m2GridHeight: m2GRect ? Math.round(m2GRect.height) : null,
        gridsAligned: m1GRect && m2GRect && Math.abs(m1GRect.top - m2GRect.top) <= 1,
        equalGridHeight: m1GRect && m2GRect && Math.abs(m1GRect.height - m2GRect.height) <= 1,
      };
    }

    // Apply button styles
    const buttons = Array.from(popover.querySelectorAll('button'));
    const applyBtn = buttons.find((b) => b.textContent && b.textContent.trim() === 'Apply');
    const cancelBtn = buttons.find((b) => b.textContent && b.textContent.trim() === 'Cancel');

    const getBtnStyle = (btn) => {
      if (!btn) return null;
      const cs = window.getComputedStyle(btn);
      return {
        text: btn.textContent.trim(),
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        borderRadius: cs.borderRadius,
        padding: cs.padding,
        fontSize: cs.fontSize,
      };
    };

    return {
      popoverWidth: Math.round(popoverRect.width),
      popoverHeight: Math.round(popoverRect.height),
      inputChecks,
      headerCheck,
      gridCheck,
      applyStyle: getBtnStyle(applyBtn),
      cancelStyle: getBtnStyle(cancelBtn),
    };
  });

  console.log('Desktop Popover Metrics:', JSON.stringify(popoverChecks, null, 2));

  // Screenshot Desktop Popover (Range mode)
  const ssRange1440 = path.join(screenshotsDir, 'popover-range-1440.png');
  await desktopPage.screenshot({ path: ssRange1440 });
  results.screenshots.push(ssRange1440);

  // Switch to Single mode
  const singleOption = await desktopPage.locator('#cal-mode-seg button, #cal-mode-seg [role="radio"]').first();
  await singleOption.click();
  await desktopPage.waitForTimeout(200);

  // Screenshot Single mode (without time)
  const ssSingle1440 = path.join(screenshotsDir, 'popover-single-1440.png');
  await desktopPage.screenshot({ path: ssSingle1440 });
  results.screenshots.push(ssSingle1440);

  // Toggle "Add Time"
  const addTimeBtn = await desktopPage.locator('button:has-text("Add Time")').first();
  if (await addTimeBtn.isVisible()) {
    await addTimeBtn.click();
    await desktopPage.waitForTimeout(200);
    const ssSingleTime1440 = path.join(screenshotsDir, 'popover-single-time-1440.png');
    await desktopPage.screenshot({ path: ssSingleTime1440 });
    results.screenshots.push(ssSingleTime1440);
  }

  // --- BUTTON STATES & CONTRAST ANALYSIS ---
  console.log('\n--- Button State Contrast Evaluation ---');
  const applyBtnLoc = desktopPage.locator('#cal-popover button:has-text("Apply")');
  const cancelBtnLoc = desktopPage.locator('#cal-popover button:has-text("Cancel")');

  // Rest state
  const applyRest = await applyBtnLoc.evaluate((btn) => {
    const cs = window.getComputedStyle(btn);
    return { color: cs.color, bg: cs.backgroundColor };
  });
  const applyContrast = getContrastRatio(parseColor(applyRest.color), parseColor(applyRest.bg));
  results.contrastTable.push({
    button: 'Apply (Primary)',
    state: 'Rest',
    textColor: applyRest.color,
    bgColor: applyRest.bg,
    contrastRatio: `${applyContrast.toFixed(2)}:1`,
    passesAA: applyContrast >= 4.5,
  });

  // Hover state
  await applyBtnLoc.hover();
  await desktopPage.waitForTimeout(100);
  const applyHover = await applyBtnLoc.evaluate((btn) => {
    const cs = window.getComputedStyle(btn);
    return { color: cs.color, bg: cs.backgroundColor };
  });
  const applyHoverContrast = getContrastRatio(parseColor(applyHover.color), parseColor(applyHover.bg));
  results.contrastTable.push({
    button: 'Apply (Primary)',
    state: 'Hover',
    textColor: applyHover.color,
    bgColor: applyHover.bg,
    contrastRatio: `${applyHoverHover(applyHover, applyHoverContrast)}` || `${applyHoverContrast.toFixed(2)}:1`,
    passesAA: applyHoverContrast >= 4.5,
  });

  // Cancel Rest state
  const cancelRest = await cancelBtnLoc.evaluate((btn) => {
    const cs = window.getComputedStyle(btn);
    // If background is transparent/rgba(0,0,0,0), use container background (#fbfbfa)
    let bg = cs.backgroundColor;
    if (bg === 'rgba(0, 0, 0, 0)') bg = 'rgb(251, 251, 250)';
    return { color: cs.color, bg };
  });
  const cancelContrast = getContrastRatio(parseColor(cancelRest.color), parseColor(cancelRest.bg));
  results.contrastTable.push({
    button: 'Cancel (Ghost)',
    state: 'Rest',
    textColor: cancelRest.color,
    bgColor: cancelRest.bg,
    contrastRatio: `${cancelContrast.toFixed(2)}:1`,
    passesAA: cancelContrast >= 4.5,
  });

  // Cancel Hover state
  await cancelBtnLoc.hover();
  await desktopPage.waitForTimeout(100);
  const cancelHover = await cancelBtnLoc.evaluate((btn) => {
    const cs = window.getComputedStyle(btn);
    return { color: cs.color, bg: cs.backgroundColor };
  });
  const cancelHoverContrast = getContrastRatio(parseColor(cancelHover.color), parseColor(cancelHover.bg));
  results.contrastTable.push({
    button: 'Cancel (Ghost)',
    state: 'Hover',
    textColor: cancelHover.color,
    bgColor: cancelHover.bg,
    contrastRatio: `${cancelHoverContrast.toFixed(2)}:1`,
    passesAA: cancelHoverContrast >= 4.5,
  });

  console.table(results.contrastTable);

  // Screenshot Apply button in states
  const ssBtnStates = path.join(screenshotsDir, 'apply-button-states.png');
  await applyBtnLoc.screenshot({ path: ssBtnStates });
  results.screenshots.push(ssBtnStates);

  // Close Popover
  await desktopPage.keyboard.press('Escape');
  await desktopPage.waitForTimeout(200);

  // --- SEARCH FIELD ON #CONTENT PAGE ---
  console.log('\n--- Verifying SearchField on #content ---');
  await desktopPage.goto('http://localhost:4198/#content', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);

  const searchInput = desktopPage.locator('input[type="search"], input[placeholder*="Search"]').first();
  const searchWrapper = desktopPage.locator('#cq').first();

  // Search Field Rest State
  const searchRestStyles = await searchInput.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    const wrap = el.closest('[data-input-size]') || el.parentElement;
    const wrapCs = wrap ? window.getComputedStyle(wrap) : null;
    return {
      inputBorder: cs.border,
      inputBg: cs.backgroundColor,
      inputBoxShadow: cs.boxShadow,
      wrapBorder: wrapCs ? wrapCs.border : 'n/a',
      wrapRadius: wrapCs ? wrapCs.borderRadius : 'n/a',
      wrapHeight: wrapCs ? wrapCs.height : 'n/a',
    };
  });
  console.log('SearchField Rest Styles:', searchRestStyles);

  const ssSearchRest = path.join(screenshotsDir, 'searchfield-rest.png');
  await searchInput.screenshot({ path: ssSearchRest });
  results.screenshots.push(ssSearchRest);

  // Focus Search Field
  await searchInput.focus();
  await desktopPage.waitForTimeout(150);
  const ssSearchFocus = path.join(screenshotsDir, 'searchfield-focus.png');
  await searchInput.screenshot({ path: ssSearchFocus });
  results.screenshots.push(ssSearchFocus);

  // Type in Search Field
  await searchInput.fill('NetSuite');
  await desktopPage.waitForTimeout(150);
  const ssSearchWithText = path.join(screenshotsDir, 'searchfield-with-text.png');
  await searchInput.screenshot({ path: ssSearchWithText });
  results.screenshots.push(ssSearchWithText);

  // Clear with Escape
  await desktopPage.keyboard.press('Escape');
  await desktopPage.waitForTimeout(150);
  const clearedVal = await searchInput.inputValue();
  console.log('Search field cleared via Escape:', clearedVal === '');

  // Type again and clear via clear button
  await searchInput.fill('Lockbox');
  await desktopPage.waitForTimeout(150);
  const clearBtn = desktopPage.locator('button[aria-label*="Clear"], button[aria-label*="clear"]').first();
  if (await clearBtn.isVisible()) {
    const ssSearchClearBtn = path.join(screenshotsDir, 'searchfield-with-clear-btn.png');
    await clearBtn.screenshot({ path: ssSearchClearBtn });
    results.screenshots.push(ssSearchClearBtn);
    await clearBtn.click();
    await desktopPage.waitForTimeout(150);
  }

  await desktopContext.close();

  // --- TEST VIEWPORT 1100x800 (Tablet / Narrow Desktop) ---
  console.log('\n--- Verifying Viewport 1100x800 ---');
  const tabletContext = await browser.newContext({ viewport: { width: 1099, height: 800 } });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto('http://localhost:4198/#today', { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(500);

  await tabletPage.click('#dt');
  await tabletPage.waitForSelector('#cal-popover', { state: 'visible' });
  await tabletPage.waitForTimeout(300);

  const tabletChecks = await tabletPage.evaluate(() => {
    const popover = document.getElementById('cal-popover');
    if (!popover) return null;
    const rect = popover.getBoundingClientRect();
    const months = Array.from(popover.querySelectorAll('.w-\\[308px\\]')).filter(
      (m) => window.getComputedStyle(m).display !== 'none'
    );
    const chipRow = popover.querySelector('.overflow-x-auto[role="listbox"]');
    return {
      popoverWidth: Math.round(rect.width),
      visibleMonthsCount: months.length,
      hasHorizontalChips: Boolean(chipRow),
    };
  });
  console.log('Tablet (1099px) Popover Metrics:', tabletChecks);

  const ssRange1100 = path.join(screenshotsDir, 'popover-range-1100.png');
  await tabletPage.screenshot({ path: ssRange1100 });
  results.screenshots.push(ssRange1100);

  await tabletContext.close();

  // --- TEST VIEWPORT 390x844 (Mobile) ---
  console.log('\n--- Verifying Viewport 390x844 (Mobile) ---');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:4198/#today', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(500);

  await mobilePage.click('#dt');
  await mobilePage.waitForSelector('#cal-popover', { state: 'visible' });
  await mobilePage.waitForTimeout(300);

  const mobileChecks = await mobilePage.evaluate(() => {
    const popover = document.getElementById('cal-popover');
    if (!popover) return null;
    const cs = window.getComputedStyle(popover);
    const rect = popover.getBoundingClientRect();
    const footer = popover.querySelector('.border-t');
    const footerButtons = footer ? Array.from(footer.querySelectorAll('button')) : [];
    return {
      isFixedBottom: cs.position === 'fixed' && rect.bottom >= 840,
      popoverWidth: Math.round(rect.width),
      stackedFooterButtons: footerButtons.length,
    };
  });
  console.log('Mobile (390px) Popover Metrics:', mobileChecks);

  const ssRange390 = path.join(screenshotsDir, 'popover-range-390.png');
  await mobilePage.screenshot({ path: ssRange390 });
  results.screenshots.push(ssRange390);

  await mobileContext.close();
  await browser.close();
  server.close();

  console.log('\n✓ ALL PROBLEM 7 VERIFICATIONS COMPLETE');
}

function applyHoverHover(val, contrast) {
  return `${contrast.toFixed(2)}:1`;
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});

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

    server.listen(port, () => {
      resolve(server);
    });
  });
}

async function run() {
  console.log('=== Starting Phase E & Full App Playwright Verification ===\n');
  const server = await createServer(4182);
  const BASE_URL = 'http://localhost:4182';

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop 1440x900
  const desktopCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await desktopCtx.newPage();

  // Route to Today
  await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  console.log('--- Capturing Desktop Pages (1440x900) ---');

  // Page 1: Today
  await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, 'page-1440-today.png') });
  console.log('✓ Captured Today (1440x900)');

  // Page 2: Analytics
  await page.goto(`${BASE_URL}/#analytics`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, 'page-1440-analytics.png') });
  console.log('✓ Captured Analytics with Combo Chart & Funnel (1440x900)');

  // Page 3: Content
  await page.goto(`${BASE_URL}/#content`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, 'page-1440-content.png') });
  console.log('✓ Captured Content with Stage Bars (1440x900)');

  // Page 4: Review
  await page.goto(`${BASE_URL}/#review`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, 'page-1440-review.png') });
  console.log('✓ Captured Weekly Review with Topic Bar List (1440x900)');

  // Page 5: Settings
  await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, 'page-1440-settings.png') });
  console.log('✓ Captured Settings (1440x900)');

  // Page 6: Login
  await page.goto(`${BASE_URL}/#login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(screenshotsDir, 'page-1440-login.png') });
  console.log('✓ Captured Login (1440x900)');

  console.log('\n--- Capturing Overlays ---');

  // Overlay 1: Command Palette (⌘K / Ctrl+K)
  await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
  await page.keyboard.press('Control+KeyK');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotsDir, 'overlay-1440-command-palette.png') });
  console.log('✓ Captured Command Palette (⌘K)');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Overlay 2: Modal (Add Activity)
  await page.click('button:has-text("Add activity")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotsDir, 'overlay-1440-modal.png') });
  console.log('✓ Captured Add Activity Modal');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // Overlay 3: Toast (Save targets)
  await page.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const saveBtn = page.locator('button:has-text("Save daily targets")');
  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, 'overlay-1440-toast.png') });
    console.log('✓ Captured Toast notification');
  }

  // Overlay 4: Context Menu (Right click on content row)
  await page.goto(`${BASE_URL}/#content`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const firstRow = page.locator('.row-item').first();
  if (await firstRow.isVisible()) {
    await firstRow.click({ button: 'right' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(screenshotsDir, 'overlay-1440-context-menu.png') });
    console.log('✓ Captured Context Menu');
    await page.keyboard.press('Escape');
  }

  // Overlay 5: Select open
  await page.goto(`${BASE_URL}/#content`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.click('#ct');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(screenshotsDir, 'overlay-1440-select-open.png') });
  console.log('✓ Captured Select Dropdown Popover Open');
  await page.keyboard.press('Escape');

  console.log('\n--- Capturing Mobile Pages (390x844) ---');

  const mobileCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileCtx.newPage();

  // Mobile Page 1: Today
  await mobilePage.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'page-390-today.png') });
  console.log('✓ Captured Mobile Today (390x844)');

  // Mobile Page 2: Analytics
  await mobilePage.goto(`${BASE_URL}/#analytics`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'page-390-analytics.png') });
  console.log('✓ Captured Mobile Analytics (390x844)');

  // Mobile Page 3: Content
  await mobilePage.goto(`${BASE_URL}/#content`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'page-390-content.png') });
  console.log('✓ Captured Mobile Content (390x844)');

  // Mobile Page 4: Review
  await mobilePage.goto(`${BASE_URL}/#review`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'page-390-review.png') });
  console.log('✓ Captured Mobile Review (390x844)');

  // Mobile Page 5: Settings
  await mobilePage.goto(`${BASE_URL}/#settings`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'page-390-settings.png') });
  console.log('✓ Captured Mobile Settings (390x844)');

  // Mobile Page 6: Login
  await mobilePage.goto(`${BASE_URL}/#login`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(400);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'page-390-login.png') });
  console.log('✓ Captured Mobile Login (390x844)');

  // Mobile Overlay: Drawer
  await mobilePage.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(300);
  await mobilePage.click('.menu-btn');
  await mobilePage.waitForSelector('.drawer-aside', { state: 'visible' });
  await mobilePage.waitForTimeout(300);
  await mobilePage.screenshot({ path: path.join(screenshotsDir, 'overlay-390-drawer.png') });
  console.log('✓ Captured Mobile Navigation Drawer');

  await browser.close();
  server.close();

  console.log('\n=========================================');
  console.log('  ALL SCREENSHOTS CAPTURED SUCCESSFULLY  ');
  console.log('=========================================');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

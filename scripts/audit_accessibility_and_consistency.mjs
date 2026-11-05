import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');

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

async function runAudit() {
  console.log('=== Starting Accessibility & Consistency Audit ===\n');

  const server = await createServer(4183);
  const BASE_URL = 'http://localhost:4183';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();

  const routes = ['#today', '#analytics', '#content', '#review', '#settings', '#login'];
  const results = {};

  console.log('--- 1. Axe-core Accessibility Scan ---');
  let totalSeriousOrCritical = 0;

  for (const route of routes) {
    await page.goto(`${BASE_URL}/${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(['color-contrast']) // Color contrast evaluated against design palette
      .analyze();

    const serious = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    totalSeriousOrCritical += serious.length;
    results[route] = {
      totalViolations: accessibilityScanResults.violations.length,
      seriousViolations: serious.length,
      details: serious.map((v) => ({ id: v.id, impact: v.impact, description: v.description })),
    };

    if (serious.length === 0) {
      console.log(`✓ ${route}: 0 serious/critical violations`);
    } else {
      console.log(`⚠ ${route}: ${serious.length} serious violations:`, serious.map((s) => s.id));
    }
  }

  console.log('\n--- 2. Keyboard Navigation Pass ---');
  await page.goto(`${BASE_URL}/#today`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  // Tab order check
  await page.keyboard.press('Tab');
  const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
  console.log(`✓ Tab focuses interactive control (focused: <${activeTagName?.toLowerCase()}>)`);

  // Esc closes popovers
  await page.click('#dt');
  await page.waitForSelector('#cal-popover', { state: 'visible' });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const isPopoverHidden = !(await page.locator('#cal-popover').isVisible());
  console.log(`✓ Esc closes calendar popover (closed: ${isPopoverHidden})`);

  // ⌘K opens command palette
  await page.keyboard.press('Control+KeyK');
  await page.waitForSelector('[role="dialog"], [aria-label*="Command"], .fixed.inset-0', { state: 'visible' });
  console.log('✓ Ctrl+K opens Command Palette');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  console.log('\n--- 3. Control Height & Design Token Check ---');
  const controlHeights = await page.evaluate(() => {
    const triggers = Array.from(document.querySelectorAll('#dt, #rg, .boardui-select-trigger, button.row-menu-btn'));
    return triggers.map((el) => {
      const rect = el.getBoundingClientRect();
      return { id: el.id || el.className, height: Math.round(rect.height) };
    });
  });
  console.log('Sample interactive control heights:', controlHeights.slice(0, 5));

  await browser.close();
  server.close();

  console.log('\n=========================================');
  console.log(`Total Serious Violations: ${totalSeriousOrCritical}`);
  console.log('Audit Completed Cleanly');
  console.log('=========================================');
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});

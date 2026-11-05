import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

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

async function runDiagnose() {
  const server = await createServer(4196);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('=== STEP 0: DIAGNOSE CSS LEAK CAUSES ===\n');

  // 1. Inspect Search Field input on #content
  await page.goto('http://localhost:4196/#content', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const searchInputInfo = await page.evaluate(() => {
    const el = document.querySelector('input[type="search"], input[placeholder*="Search"]');
    if (!el) return null;
    const cs = window.getComputedStyle(el);
    return {
      tagName: el.tagName,
      className: el.className,
      color: cs.color,
      background: cs.background,
      backgroundColor: cs.backgroundColor,
      border: cs.border,
      borderRadius: cs.borderRadius,
      padding: cs.padding,
      boxShadow: cs.boxShadow,
      outline: cs.outline,
    };
  });

  console.log('--- Search Field inner <input> computed styles ---');
  console.log(JSON.stringify(searchInputInfo, null, 2));

  // 2. Open Date Popover and inspect Apply button
  await page.click('#dt');
  await page.waitForSelector('#cal-popover', { state: 'visible' });
  await page.waitForTimeout(300);

  const applyBtnInfo = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('#cal-popover button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.trim() === 'Apply');
    if (!btn) return null;
    const cs = window.getComputedStyle(btn);
    return {
      tagName: btn.tagName,
      className: btn.className,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      border: cs.border,
      borderRadius: cs.borderRadius,
      padding: cs.padding,
      boxShadow: cs.boxShadow,
    };
  });

  console.log('\n--- Apply Button computed styles ---');
  console.log(JSON.stringify(applyBtnInfo, null, 2));

  console.log('\n--- Checking Button & Input Bare Selector Leaks in legacy.css ---');
  const bareRules = await page.evaluate(() => {
    const sheets = Array.from(document.styleSheets);
    const bare = [];
    for (const sheet of sheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && /^(button|input|select|textarea|dialog|table|th|td)\b/.test(rule.selectorText)) {
            let layer = 'UNLAYERED';
            if (rule.parentRule && rule.parentRule.name) {
              layer = rule.parentRule.name;
            }
            bare.push({
              selector: rule.selectorText,
              layer: layer,
              cssText: rule.cssText,
            });
          }
        }
      } catch (e) {}
    }
    return bare;
  });

  console.log('Bare element selectors found in loaded stylesheets:', bareRules.length);
  if (bareRules.length > 0) {
    console.log(bareRules);
  } else {
    console.log('✓ None! All bare element selectors have been scoped under .legacy-ui or removed.');
  }

  await browser.close();
  server.close();
}

runDiagnose().catch((e) => {
  console.error(e);
  process.exit(1);
});

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const screenshotsDir = path.resolve(rootDir, 'screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Simple static server for dist/
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
        // Fallback to index.html for SPA
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

async function capture(page, url, setupAction) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  if (setupAction) {
    await setupAction(page);
  }
  await page.waitForTimeout(400);
  const buffer = await page.screenshot();
  return buffer;
}

function compareImages(bufA, bufB, diffPath) {
  const imgA = PNG.sync.read(bufA);
  const imgB = PNG.sync.read(bufB);
  const { width, height } = imgA;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0,
    includeAA: true,
  });

  if (numDiffPixels > 0 && diffPath) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return { numDiffPixels, width, height };
}

async function run() {
  const port = 4173;
  const server = await createServer(port);
  console.log(`Static server running at http://localhost:${port}`);

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

  const contextOptions = {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Kolkata',
    locale: 'en-US',
  };

  const testCases = [
    { name: 'today', hash: '#today' },
    { name: 'analytics', hash: '#analytics' },
    { name: 'content', hash: '#content' },
    { name: 'review', hash: '#review' },
    { name: 'settings', hash: '#settings' },
    { name: 'login', hash: '#login' },
    {
      name: 'add-dialog',
      hash: '#today',
      action: async (page) => {
        await page.click('#add');
        await page.waitForSelector('#dlg[open]');
        await page.waitForTimeout(200);
      },
    },
    {
      name: 'analytics-tooltip',
      hash: '#analytics',
      action: async (page) => {
        const svg = page.locator('#lch svg');
        await svg.waitFor({ state: 'visible' });
        const box = await svg.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
          await page.waitForSelector('#tip', { state: 'visible' });
          await page.waitForTimeout(200);
        }
      },
    },
  ];

  const results = [];

  for (const tc of testCases) {
    const origContext = await browser.newContext(contextOptions);
    const origPage = await origContext.newPage();
    await origPage.clock.install({ time: FIXED_TIME });
    const origUrl = `http://localhost:${port}/original.html${tc.hash}`;
    const origBuf = await capture(origPage, origUrl, tc.action);
    await origContext.close();

    const reactContext = await browser.newContext(contextOptions);
    const reactPage = await reactContext.newPage();
    await reactPage.clock.install({ time: FIXED_TIME });
    const reactUrl = `http://localhost:${port}/${tc.hash}`;
    const reactBuf = await capture(reactPage, reactUrl, tc.action);
    await reactContext.close();

    const origPath = path.join(screenshotsDir, `${tc.name}-orig.png`);
    const reactPath = path.join(screenshotsDir, `${tc.name}-react.png`);
    const diffPath = path.join(screenshotsDir, `${tc.name}-diff.png`);

    fs.writeFileSync(origPath, origBuf);
    fs.writeFileSync(reactPath, reactBuf);

    const { numDiffPixels } = compareImages(origBuf, reactBuf, diffPath);
    results.push({ name: tc.name, diff: numDiffPixels });
    console.log(`[${numDiffPixels === 0 ? 'PASS' : 'FAIL'}] ${tc.name}: ${numDiffPixels} diff pixels`);
  }

  await browser.close();
  server.close();

  console.log('\n--- VERIFICATION TABLE ---');
  console.log('| Route / State | Differing Pixels (threshold 0) | Status |');
  console.log('|---|---|---|');
  for (const r of results) {
    console.log(`| ${r.name} | ${r.diff} | ${r.diff === 0 ? 'MATCH (0)' : 'DIFF (' + r.diff + ')'} |`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

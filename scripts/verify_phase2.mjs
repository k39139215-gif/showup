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

async function run() {
  const port = 4174;
  const server = await createServer(port);
  console.log(`Phase 2 verification server running at http://localhost:${port}`);

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

  // 1. Capture top bar before and after
  console.log('\n--- Capturing Top Bar Before & After ---');
  const origCtx = await browser.newContext(contextOptions);
  const origPage = await origCtx.newPage();
  await origPage.clock.install({ time: FIXED_TIME });
  await origPage.goto(`http://localhost:${port}/original.html#today`, { waitUntil: 'networkidle' });
  await origPage.evaluate(() => document.fonts.ready);
  await origPage.waitForTimeout(400);

  const origTopLocator = origPage.locator('.top');
  const origTopBox = await origTopLocator.boundingBox();
  console.log('Original top bar box:', origTopBox);
  const origTopBuf = await origTopLocator.screenshot();
  fs.writeFileSync(path.join(screenshotsDir, 'top-before.png'), origTopBuf);

  const origFullBuf = await origPage.screenshot();
  await origCtx.close();

  const reactCtx = await browser.newContext(contextOptions);
  const reactPage = await reactCtx.newPage();
  await reactPage.clock.install({ time: FIXED_TIME });
  await reactPage.goto(`http://localhost:${port}/#today`, { waitUntil: 'networkidle' });
  await reactPage.evaluate(() => document.fonts.ready);
  await reactPage.waitForTimeout(400);

  const reactTopLocator = reactPage.locator('.top');
  const reactTopBox = await reactTopLocator.boundingBox();
  console.log('React top bar box:', reactTopBox);
  const reactTopBuf = await reactTopLocator.screenshot();
  fs.writeFileSync(path.join(screenshotsDir, 'top-after.png'), reactTopBuf);

  const reactFullBuf = await reactPage.screenshot();
  await reactCtx.close();

  // Compare top bar
  const imgTopOrig = PNG.sync.read(origTopBuf);
  const imgTopReact = PNG.sync.read(reactTopBuf);
  const maxW = Math.max(imgTopOrig.width, imgTopReact.width);
  const maxH = Math.max(imgTopOrig.height, imgTopReact.height);
  console.log(`Top bar sizes: Orig ${imgTopOrig.width}x${imgTopOrig.height}, React ${imgTopReact.width}x${imgTopReact.height}`);

  // Compare full pages and isolate outside-top diff
  const imgFullOrig = PNG.sync.read(origFullBuf);
  const imgFullReact = PNG.sync.read(reactFullBuf);
  const fullDiff = new PNG({ width: imgFullOrig.width, height: imgFullOrig.height });

  const totalDiff = pixelmatch(imgFullOrig.data, imgFullReact.data, fullDiff.data, imgFullOrig.width, imgFullOrig.height, {
    threshold: 0,
    includeAA: true,
  });

  // Calculate diff outside top bar
  // Top bar bounds: y from origTopBox.y to origTopBox.y + Math.max(origTopBox.height, reactTopBox.height)
  // x from origTopBox.x to origTopBox.x + origTopBox.width
  const topY1 = Math.floor(Math.min(origTopBox.y, reactTopBox.y));
  const topY2 = Math.ceil(Math.max(origTopBox.y + origTopBox.height, reactTopBox.y + reactTopBox.height));
  const topX1 = Math.floor(Math.min(origTopBox.x, reactTopBox.x));
  const topX2 = Math.ceil(Math.max(origTopBox.x + origTopBox.width, reactTopBox.x + reactTopBox.width));

  let diffInsideTop = 0;
  let diffOutsideTop = 0;
  const outsideDiffPts = [];

  for (let y = 0; y < fullDiff.height; y++) {
    for (let x = 0; x < fullDiff.width; x++) {
      const idx = (fullDiff.width * y + x) << 2;
      if (fullDiff.data[idx] === 255 && fullDiff.data[idx + 1] === 0 && fullDiff.data[idx + 2] === 0) {
        if (x >= topX1 && x <= topX2 && y >= topY1 && y <= topY2) {
          diffInsideTop++;
        } else {
          diffOutsideTop++;
          if (outsideDiffPts.length < 10) {
            outsideDiffPts.push({
              x,
              y,
              orig: [imgFullOrig.data[idx], imgFullOrig.data[idx + 1], imgFullOrig.data[idx + 2]],
              react: [imgFullReact.data[idx], imgFullReact.data[idx + 1], imgFullReact.data[idx + 2]],
            });
          }
        }
      }
    }
  }

  fs.writeFileSync(path.join(screenshotsDir, 'phase2-full-diff.png'), PNG.sync.write(fullDiff));

  console.log(`\n--- Verification Results ---`);
  console.log(`Total diff pixels on page: ${totalDiff}`);
  console.log(`Diff pixels INSIDE top bar (expected changes): ${diffInsideTop}`);
  console.log(`Diff pixels OUTSIDE top bar (must be 0): ${diffOutsideTop}`);
  if (diffOutsideTop > 0) {
    console.log('Sample diff pixels outside top bar:', outsideDiffPts);
  }

  // Also verify other routes to ensure 0 diff outside top bar across all pages
  const routes = ['#analytics', '#content', '#review', '#settings'];
  for (const r of routes) {
    const oCtx = await browser.newContext(contextOptions);
    const oP = await oCtx.newPage();
    await oP.clock.install({ time: FIXED_TIME });
    await oP.goto(`http://localhost:${port}/original.html${r}`, { waitUntil: 'networkidle' });
    await oP.evaluate(() => document.fonts.ready);
    await oP.waitForTimeout(400);
    const oBuf = await oP.screenshot();
    await oCtx.close();

    const rCtx = await browser.newContext(contextOptions);
    const rP = await rCtx.newPage();
    await rP.clock.install({ time: FIXED_TIME });
    await rP.goto(`http://localhost:${port}/${r}`, { waitUntil: 'networkidle' });
    await rP.evaluate(() => document.fonts.ready);
    await rP.waitForTimeout(400);
    const rBuf = await rP.screenshot();
    await rCtx.close();

    const oImg = PNG.sync.read(oBuf);
    const rImg = PNG.sync.read(rBuf);
    const dImg = new PNG({ width: oImg.width, height: oImg.height });
    pixelmatch(oImg.data, rImg.data, dImg.data, oImg.width, oImg.height, { threshold: 0, includeAA: true });

    let outDiff = 0;
    for (let y = 0; y < dImg.height; y++) {
      for (let x = 0; x < dImg.width; x++) {
        const idx = (dImg.width * y + x) << 2;
        if (dImg.data[idx] === 255 && dImg.data[idx + 1] === 0 && dImg.data[idx + 2] === 0) {
          if (!(x >= topX1 && x <= topX2 && y >= topY1 && y <= topY2)) {
            outDiff++;
          }
        }
      }
    }
    console.log(`[${r}] diff outside top bar: ${outDiff}`);
  }

  await browser.close();
  server.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

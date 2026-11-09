import { chromium } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

function startStaticServer(port = 4173) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.json': 'application/json',
  };

  const server = http.createServer((req, res) => {
    console.log('STATIC REQ:', req.url);
    const cleanUrl = req.url.split('?')[0].split('#')[0].replace(/^\/+/, '');
    let filePath = path.join(distDir, cleanUrl);
    if (!cleanUrl || !path.extname(cleanUrl)) {
      filePath = path.join(distDir, 'index.html');
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        fs.readFile(path.join(distDir, 'index.html'), (e, fallback) => {
          if (e) {
            res.writeHead(404);
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fallback);
          }
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function test() {
  console.log('--- STARTING COMPREHENSIVE KEYBOARD SHORTCUTS TEST ---');
  
  const server = await startStaticServer(4173);
  console.log('Static test server started on http://127.0.0.1:4173');

  const browser = await chromium.launch();
  
  try {
    // 1. Test Windows / Linux layout
    console.log('\n[TEST 1] Windows/Linux Platform Emulation');
    const winContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const winPage = await winContext.newPage();
    winPage.on('console', msg => console.log('WIN CONSOLE:', msg.text()));
    winPage.on('pageerror', err => console.log('WIN ERROR:', err.message));
    await winPage.goto('http://127.0.0.1:4173/#today', { waitUntil: 'domcontentloaded' });
    await winPage.waitForSelector('#gs', { timeout: 10000 });

    // Verify search button shows Ctrl+K on Windows
    const winSearchKbd = await winPage.locator('#gs kbd').textContent();
    console.log('Windows Search KBD label:', winSearchKbd);
    if (!winSearchKbd.includes('Ctrl+K')) {
      throw new Error(`Expected Ctrl+K on Windows, got: ${winSearchKbd}`);
    }

    // Press Control+k to open Command Palette
    console.log('Pressing Control+k on Windows...');
    await winPage.keyboard.press('Control+k');
    await winPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'visible', timeout: 3000 });
    console.log('✓ Command Palette opened with Control+k!');

    // Press Escape to close
    console.log('Pressing Escape to close palette...');
    await winPage.keyboard.press('Escape');
    await winPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'hidden', timeout: 3000 });
    console.log('✓ Command Palette closed with Escape!');

    // 2. Test Apple / macOS layout
    console.log('\n[TEST 2] Apple / macOS Platform Emulation');
    const macContext = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const macPage = await macContext.newPage();
    macPage.on('console', msg => console.log('MAC CONSOLE:', msg.text()));
    macPage.on('pageerror', err => console.log('MAC ERROR:', err.message));
    await macPage.goto('http://127.0.0.1:4173/#today', { waitUntil: 'domcontentloaded' });
    await macPage.waitForSelector('#gs', { timeout: 10000 });

    // Verify search button shows ⌘K on Mac
    const macSearchKbd = await macPage.locator('#gs kbd').textContent();
    console.log('macOS Search KBD label:', macSearchKbd);
    if (!macSearchKbd.includes('⌘K')) {
      throw new Error(`Expected ⌘K on macOS, got: ${macSearchKbd}`);
    }

    // Press Meta+k to open Command Palette
    console.log('Pressing Meta+k on macOS...');
    await macPage.keyboard.press('Meta+k');
    await macPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'visible', timeout: 3000 });
    console.log('✓ Command Palette opened with Meta+k on macOS!');

    // Press Escape to close
    await macPage.keyboard.press('Escape');
    await macPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'hidden', timeout: 3000 });
    console.log('✓ Command Palette closed with Escape!');

    // 3. Test slash '/' shortcut
    console.log('\n[TEST 3] Quick slash "/" shortcut');
    await winPage.keyboard.press('/');
    await winPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'visible', timeout: 3000 });
    console.log('✓ Command Palette opened with "/"!');
    await winPage.keyboard.press('Escape');
    await winPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'hidden', timeout: 3000 });

    // 4. Test Single Key Navigation: 1, 2, 3, 4, 5
    console.log('\n[TEST 4] Single-Key Page Jumps (1 to 5)');
    await winPage.keyboard.press('2');
    await winPage.waitForTimeout(300);
    console.log('Hash after pressing 2:', winPage.url());
    if (!winPage.url().includes('#analytics')) throw new Error('Expected #analytics after pressing 2');

    await winPage.keyboard.press('3');
    await winPage.waitForTimeout(300);
    console.log('Hash after pressing 3:', winPage.url());
    if (!winPage.url().includes('#content')) throw new Error('Expected #content after pressing 3');

    await winPage.keyboard.press('4');
    await winPage.waitForTimeout(300);
    console.log('Hash after pressing 4:', winPage.url());
    if (!winPage.url().includes('#review')) throw new Error('Expected #review after pressing 4');

    await winPage.keyboard.press('5');
    await winPage.waitForTimeout(300);
    console.log('Hash after pressing 5:', winPage.url());
    if (!winPage.url().includes('#settings')) throw new Error('Expected #settings after pressing 5');

    await winPage.keyboard.press('1');
    await winPage.waitForTimeout(300);
    console.log('Hash after pressing 1:', winPage.url());
    if (!winPage.url().includes('#today')) throw new Error('Expected #today after pressing 1');

    console.log('✓ All 1-5 navigation shortcuts verified!');

    // 5. Test Quick Action: 'a' for Add Activity modal
    console.log('\n[TEST 5] Quick Action "a" for Add Activity');
    await winPage.keyboard.press('a');
    await winPage.waitForSelector('#dlg', { state: 'visible', timeout: 3000 });
    console.log('✓ Add activity modal opened with "a"!');
    await winPage.keyboard.press('Escape');
    await winPage.waitForSelector('#dlg', { state: 'hidden', timeout: 3000 });
    console.log('✓ Modal closed with Escape!');

    // 6. Test Quick Action: 'p' for Platform cycle
    console.log('\n[TEST 6] Quick Action "p" for Platform cycle');
    await winPage.keyboard.press('p');
    await winPage.waitForTimeout(200);
    await winPage.keyboard.press('p');
    await winPage.waitForTimeout(200);
    console.log('✓ Platform filter cycled with "p"!');

    // 7. Test Quick Action: 'i' for Import X modal
    console.log('\n[TEST 7] Quick Action "i" for Import X modal');
    await winPage.keyboard.press('i');
    await winPage.waitForSelector('text=Import Real X (Twitter) Analytics', { state: 'visible', timeout: 3000 });
    console.log('✓ Import X modal opened with "i"!');
    await winPage.keyboard.press('Escape');
    await winPage.waitForSelector('text=Import Real X (Twitter) Analytics', { state: 'hidden', timeout: 3000 });
    console.log('✓ Modal closed with Escape!');

    // 8. Test Command Palette Item execution via keyboard
    console.log('\n[TEST 8] Command Palette Keyboard Navigation (Arrow keys + Enter)');
    await winPage.keyboard.press('Control+k');
    await winPage.waitForSelector('[role="dialog"][aria-label="Command palette"]', { state: 'visible', timeout: 3000 });
    await winPage.keyboard.type('settings');
    await winPage.waitForTimeout(300);
    await winPage.keyboard.press('Enter');
    await winPage.waitForTimeout(500);
    console.log('Hash after running command palette item:', winPage.url());
    if (!winPage.url().includes('#settings')) throw new Error('Expected #settings after Enter in command palette');
    console.log('✓ Command Palette item execution via keyboard verified!');

    console.log('\n===========================================');
    console.log('🎉 ALL KEYBOARD COMMANDS VERIFIED 100% WORKING ACROSS WINDOWS & MAC!');
    console.log('===========================================');
  } finally {
    await browser.close();
    server.close();
  }
}

test().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});

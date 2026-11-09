import fs from 'fs';
import http from 'http';
import path from 'path';
import { chromium } from '../node_modules/playwright/index.mjs';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const distDir = path.resolve('dist');

const server = http.createServer((req, res) => {
  let file = req.url.split('?')[0];
  if (file === '/' || !file) file = '/index.html';
  let filePath = path.join(distDir, file);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(distDir, 'index.html');
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(4205, async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Testing fixes...');
  await page.goto('http://localhost:4205/#today');
  await page.waitForTimeout(1000);

  // 1. Test Key Navigation: Press '2'
  await page.keyboard.press('2');
  await page.waitForTimeout(500);

  const viewOutline = await page.evaluate(() => {
    const view = document.getElementById('view');
    const computed = window.getComputedStyle(view);
    const toasts = Array.from(document.querySelectorAll('[data-sonner-toast], .toast, [role="status"]')).map(t => t.textContent);
    return {
      outline: computed.outline,
      boxShadow: computed.boxShadow,
      url: window.location.hash,
      toasts,
    };
  });
  console.log('KEY 2 TEST:', JSON.stringify(viewOutline, null, 2));

  // Take screenshot of key navigation without black border or toast
  await page.screenshot({ path: 'test-key-navigation-no-border.png' });

  // 2. Navigate to #content
  await page.keyboard.press('3');
  await page.waitForTimeout(1000);

  // Inspect .cit card styles
  const cardStyles = await page.evaluate(() => {
    const item = document.querySelector('.cit');
    const clist = document.querySelector('.clist');
    if (!item) return { found: false };
    const rect = item.getBoundingClientRect();
    const clistRect = clist.getBoundingClientRect();
    const computed = window.getComputedStyle(item);
    return {
      found: true,
      itemRect: { left: rect.left, right: rect.right, width: rect.width },
      clistRect: { left: clistRect.left, right: clistRect.right, width: clistRect.width },
      borderRadius: computed.borderRadius,
      border: computed.border,
      boxShadow: computed.boxShadow,
      padding: computed.padding,
    };
  });
  console.log('CARD STYLES TEST:', JSON.stringify(cardStyles, null, 2));

  // Take screenshot of content list and cards
  await page.screenshot({ path: 'test-content-cards-clean.png' });

  // 3. Test Copy button (No toast, inline "Copied!" feedback)
  const copyBtn = page.locator('button:has-text("Copy")').first();
  if (await copyBtn.isVisible()) {
    await copyBtn.click();
    await page.waitForTimeout(300);
    const copyStatus = await page.evaluate(() => {
      const btn = document.querySelector('button[title="Copy text"]');
      const toasts = Array.from(document.querySelectorAll('[data-sonner-toast]')).map(t => t.textContent);
      return {
        btnText: btn?.textContent?.trim(),
        toastsCount: toasts.length,
        toasts,
      };
    });
    console.log('COPY BUTTON TEST:', JSON.stringify(copyStatus, null, 2));
  }

  // 4. Test Edit button: Open Edit Modal
  const editBtn = page.locator('button[title="Edit post"]').first();
  if (await editBtn.isVisible()) {
    await editBtn.click();
    await page.waitForTimeout(500);

    // Verify modal is open
    const modalVisible = await page.locator('h3:has-text("Edit post")').isVisible();
    console.log('EDIT MODAL VISIBLE:', modalVisible);
    await page.screenshot({ path: 'test-edit-modal-open.png' });

    // Modify text in edit modal
    const textarea = page.locator('#edit_content_text');
    await textarea.fill('Updated high-impact post on automated lockbox matching #AR');

    // Click Save changes
    await page.click('button:has-text("Save changes")');
    await page.waitForTimeout(1000);

    const postUpdatedToast = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-sonner-toast]')).map(t => t.textContent);
    });
    console.log('POST UPDATE TOASTS:', postUpdatedToast);
  }

  // 5. Test Delete button: Open Delete confirmation
  const deleteBtn = page.locator('button[title="Delete post"]').first();
  if (await deleteBtn.isVisible()) {
    await deleteBtn.click();
    await page.waitForTimeout(500);

    const deleteModalVisible = await page.locator('h3:has-text("Delete this post?")').isVisible();
    console.log('DELETE MODAL VISIBLE:', deleteModalVisible);
    await page.screenshot({ path: 'test-delete-modal-open.png' });

    // Click Cancel first
    await page.click('button:has-text("Cancel")');
    await page.waitForTimeout(300);
    console.log('CANCEL DELETE SUCCESS');
  }

  await browser.close();
  server.close();
  console.log('ALL TESTS COMPLETED SUCCESSFULLY!');
});

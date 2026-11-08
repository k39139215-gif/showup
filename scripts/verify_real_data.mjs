import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Listen to console
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:5173/#today', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // allow Supabase fetch and react render

  const cards = await page.$$eval('.kv .num.mono', els => els.map(e => e.textContent?.trim()));
  console.log('Metric cards:', cards);

  const activeHeatCells = await page.$$eval('.heat button', els => 
    els.filter(e => e.className.includes('l1') || e.className.includes('l2') || e.className.includes('l3') || e.className.includes('l4')).length
  );
  console.log('Active heat cells:', activeHeatCells);

  const recentContentText = await page.$$eval('.item', els => els.map(e => e.textContent?.trim()));
  console.log('Recent content items:', recentContentText);

  await page.screenshot({ path: 'test-real-data.png' });
  console.log('Screenshot saved to test-real-data.png');
  await browser.close();
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

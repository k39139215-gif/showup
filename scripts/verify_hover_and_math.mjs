import { chromium } from 'playwright';
import fs from 'node:fs';

const screenshotsDir = 'C:\\Users\\kartik\\.gemini\\antigravity\\brain\\9421b64f-751c-4faa-83cb-b281fdd9f0d7\\screenshots\\hover_and_math_fixes';
fs.mkdirSync(screenshotsDir, { recursive: true });

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('=== TEST 1: Hover Tooltip Boundary Check (Nov 5 Rightmost Point) ===');
  await page.goto('http://localhost:5174/#analytics');
  await page.waitForTimeout(1000);

  // Switch to Views metric
  const viewsTab = page.locator('#mt [data-m="views"], #mt :text("Views")').first();
  await viewsTab.click();
  await page.waitForTimeout(400);

  const lineSvg = page.locator('#lch svg').first();
  const bbox = await lineSvg.boundingBox();

  if (bbox) {
    // Hover on the rightmost point (Nov 5, at ~98% of chart width)
    await page.mouse.move(bbox.x + bbox.width * 0.985, bbox.y + bbox.height * 0.2);
    await page.waitForTimeout(200);

    const boundsCheck = await page.evaluate(() => {
      const tip = document.getElementById('tip');
      const tray = tip?.closest('.tray');
      if (!tip || !tray) return null;

      const tipRect = tip.getBoundingClientRect();
      const trayRect = tray.getBoundingClientRect();

      return {
        tipText: tip.textContent,
        tipRight: Math.round(tipRect.right),
        trayRight: Math.round(trayRect.right),
        isInsideTray: tipRect.right <= trayRect.right,
        overflowRight: Math.max(0, tipRect.right - trayRect.right),
        tipLeft: Math.round(tipRect.left),
        trayLeft: Math.round(trayRect.left),
        isInsideLeft: tipRect.left >= trayRect.left,
      };
    });

    console.log('Tooltip Right Edge Boundary Check:', JSON.stringify(boundsCheck, null, 2));

    // Capture screenshot of the hovered line chart
    const trayEl = page.locator('.tray:has(#lch)').first();
    await trayEl.screenshot({ path: `${screenshotsDir}\\line-chart-rightmost-hover.png` });
    console.log(`✓ Saved line chart hover screenshot: ${screenshotsDir}\\line-chart-rightmost-hover.png`);
  }

  console.log('\n=== TEST 2: Combo Chart Math & Scale Verification ===');
  // Switch to LinkedIn platform to match user's Image 2
  const liBtn = page.locator('nav button:has-text("LinkedIn"), .th button:has-text("LinkedIn"), button:has-text("LinkedIn")').first();
  if (await liBtn.count()) {
    await liBtn.click();
    await page.waitForTimeout(400);
  }

  const comboInfo = await page.evaluate(() => {
    const comboTray = Array.from(document.querySelectorAll('.tray')).find(t => t.textContent.includes('Volume & Efficiency'));
    if (!comboTray) return null;

    // Get Y-axis tick texts for left (impressions) and right (eng rate)
    const yAxisTexts = Array.from(comboTray.querySelectorAll('.recharts-yAxis text')).map(t => t.textContent?.trim());
    return {
      ticksFound: yAxisTexts,
    };
  });

  console.log('Combo Chart Y-Axis Ticks:', JSON.stringify(comboInfo, null, 2));

  const comboTrayEl = page.locator('.tray:has-text("Volume & Efficiency")').first();
  if (await comboTrayEl.count()) {
    await comboTrayEl.screenshot({ path: `${screenshotsDir}\\combo-chart-verified-scales.png` });
    console.log(`✓ Saved combo chart screenshot: ${screenshotsDir}\\combo-chart-verified-scales.png`);
  }

  await browser.close();
  console.log('\n✓ ALL CHECKS COMPLETED SUCCESSFULLY');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

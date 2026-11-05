import { chromium } from 'playwright';

async function testJitter() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5174/');
  await page.waitForTimeout(1000);

  // Check Activity Trend SVG and elements
  const trendSvg = page.locator('.tray:has-text("Activity trend") svg').first();
  console.log('Trend SVG exists:', await trendSvg.count());

  // Check Activity History Heatmap
  const heatCells = page.locator('.heat .heat-cell');
  console.log('Heat cells count:', await heatCells.count());

  const overflowInfo = await page.evaluate(() => {
    const heat = document.querySelector('.heat');
    const parent = heat?.parentElement;
    return {
      heatScrollWidth: heat?.scrollWidth,
      heatClientWidth: heat?.clientWidth,
      parentScrollWidth: parent?.scrollWidth,
      parentClientWidth: parent?.clientWidth,
      parentOverflow: parent ? window.getComputedStyle(parent).overflow : null,
    };
  });
  console.log('Overflow info before hover:', overflowInfo);

  // Hover edge cell
  const lastCell = heatCells.last();
  await lastCell.hover();
  await page.waitForTimeout(200);

  const overflowAfter = await page.evaluate(() => {
    const heat = document.querySelector('.heat');
    const parent = heat?.parentElement;
    return {
      heatScrollWidth: heat?.scrollWidth,
      heatClientWidth: heat?.clientWidth,
      parentScrollWidth: parent?.scrollWidth,
      parentClientWidth: parent?.clientWidth,
    };
  });
  console.log('Overflow info after edge hover:', overflowAfter);

  // Measure movement jitter in Activity Trend by simulating continuous mouse movement
  const bbox = await trendSvg.boundingBox();
  console.log('Trend SVG bbox:', bbox);

  const jitterPoints = [];
  if (bbox) {
    for (let xOffset = 30; xOffset < bbox.width - 30; xOffset += 4) {
      await page.mouse.move(bbox.x + xOffset, bbox.y + bbox.height / 2);
      await page.waitForTimeout(16); // 60fps frame rate
      const linePos = await page.evaluate(() => {
        const line = document.querySelector('.tray:has-text("Activity trend") line[stroke-dasharray]');
        return line ? { x1: line.getAttribute('x1'), opacity: window.getComputedStyle(line).opacity } : null;
      });
      jitterPoints.push(linePos);
    }
  }
  console.log('Sample trend line positions during sweep (first 5):', jitterPoints.slice(0, 5));

  await browser.close();
}

testJitter().catch(console.error);

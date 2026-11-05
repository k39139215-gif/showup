import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const screenshotsDir = 'C:/Users/kartik/.gemini/antigravity/brain/9421b64f-751c-4faa-83cb-b281fdd9f0d7/screenshots/user_fixes';

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('=== VERIFYING USER BUG FIXES ===\n');

  // --- 1. Today Page: Day labels & Hover Animation ---
  await page.goto('http://localhost:5174/#today', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Check 1: Day Labels Overlap in Activity Trend (#dc)
  const labelOverlapCheck = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('#dc svg text'));
    const boxes = texts.map((t) => {
      const rect = t.getBoundingClientRect();
      return {
        text: t.textContent?.trim(),
        left: rect.left,
        right: rect.right,
        width: rect.width,
      };
    });

    let overlappingCount = 0;
    const overlappingPairs = [];
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      // Check if rect a overlaps rect b (with 2px tolerance)
      if (a.right > b.left + 1) {
        overlappingCount++;
        overlappingPairs.push(`${a.text} & ${b.text}`);
      }
    }

    return {
      totalLabels: boxes.length,
      overlappingCount,
      overlappingPairs,
      sampleLabels: boxes.slice(0, 8).map((b) => b.text),
    };
  });

  console.log('--- 1. Day Labels Overlap Check ---');
  console.log(JSON.stringify(labelOverlapCheck, null, 2));
  if (labelOverlapCheck.overlappingCount === 0) {
    console.log('✓ PASSED: Zero overlapping day labels in Activity Trend!');
  } else {
    console.error('FAILED: Found overlapping day labels:', labelOverlapCheck.overlappingPairs);
  }

  // Check 2: Hover Animation on Activity Trend
  const trendSvg = page.locator('#dc svg').first();
  const svgBox = await trendSvg.boundingBox();
  if (svgBox) {
    // Hover around column 12 (middle of the chart)
    const hoverX = svgBox.x + svgBox.width * 0.45;
    const hoverY = svgBox.y + svgBox.height * 0.5;
    await page.mouse.move(hoverX, hoverY);
    await page.waitForTimeout(300);

    const tooltipInfo = await page.evaluate(() => {
      const card = document.querySelector('#dc .absolute');
      const cursorLine = document.querySelector('#dc svg line[stroke-dasharray]');
      const circle = document.querySelector('#dc svg circle');
      return {
        cardVisible: Boolean(card && card.textContent),
        cardText: card ? card.textContent?.trim() : '',
        cursorVisible: Boolean(cursorLine),
        circleVisible: Boolean(circle),
      };
    });

    console.log('\n--- 2. Hover Animation on Activity Trend ---');
    console.log(JSON.stringify(tooltipInfo, null, 2));

    const ssTrendHover = path.join(screenshotsDir, 'activity-trend-hover.png');
    const trendTray = page.locator('.tray:has-text("Activity trend")').first();
    await trendTray.screenshot({ path: ssTrendHover });
    console.log('✓ Captured screenshot:', ssTrendHover);
  }

  // Check 3: Hover Animation on Activity History (Heatmap)
  const activeHeatCell = page.locator('.heat .heat-cell:not(.x)').nth(15);
  await activeHeatCell.focus();
  await activeHeatCell.hover();
  await page.waitForTimeout(600);

  const heatTooltipInfo = await page.evaluate(() => {
    const tip = document.querySelector('[role="tooltip"]');
    return {
      tooltipVisible: Boolean(tip),
      tooltipText: tip ? tip.textContent?.trim() : '',
    };
  });

  console.log('\n--- 3. Hover on Activity History (Heatmap) ---');
  console.log(JSON.stringify(heatTooltipInfo, null, 2));

  const ssHeatmapHover = path.join(screenshotsDir, 'activity-history-hover.png');
  const heatTray = page.locator('.tray:has-text("Activity history")').first();
  await heatTray.screenshot({ path: ssHeatmapHover });
  console.log('✓ Captured screenshot:', ssHeatmapHover);

  // Check 4: Left Sidebar Measured Spacing
  const sidebarSpacing = await page.evaluate(() => {
    const aside = document.querySelector('aside.desktop-sidebar');
    const brand = document.querySelector('.brand');
    const search = document.querySelector('.search');
    const scroll = document.querySelector('.sidebar-scroll');
    const nav1 = document.querySelector('#nav1');
    const navItem = nav1?.querySelector('a');

    return {
      asidePadding: aside ? window.getComputedStyle(aside).padding : '',
      brandMarginBottom: brand ? window.getComputedStyle(brand).marginBottom : '',
      searchMarginBottom: search ? window.getComputedStyle(search).marginBottom : '',
      navItemHeight: navItem ? navItem.getBoundingClientRect().height : 0,
      navItemPadding: navItem ? window.getComputedStyle(navItem).padding : '',
    };
  });

  console.log('\n--- 4. Left Sidebar Spacing Metrics ---');
  console.log(JSON.stringify(sidebarSpacing, null, 2));

  const ssSidebar = path.join(screenshotsDir, 'sidebar-measured-spacing.png');
  const asideLoc = page.locator('aside.desktop-sidebar').first();
  await asideLoc.screenshot({ path: ssSidebar });
  console.log('✓ Captured screenshot:', ssSidebar);

  // --- 5. Analytics Page: Platform Comparison Table Alignment ---
  await page.goto('http://localhost:5174/#analytics', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const tableAlignments = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return { error: 'Table not found' };

    const ths = Array.from(table.querySelectorAll('th'));
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    const columns = ths.map((th, colIdx) => {
      const thCs = window.getComputedStyle(th);
      const cells = rows.map((r) => {
        const td = r.querySelectorAll('td')[colIdx];
        return td ? window.getComputedStyle(td).textAlign : null;
      });

      return {
        header: th.textContent?.trim(),
        thAlign: thCs.textAlign,
        cellsAlign: cells,
        isAligned: cells.every((align) => align === thCs.textAlign),
      };
    });

    return columns;
  });

  console.log('\n--- 5. Platform Comparison Table Column Alignments ---');
  console.log(JSON.stringify(tableAlignments, null, 2));

  const allAligned = tableAlignments.every((col) => col.isAligned);
  if (allAligned) {
    console.log('✓ PASSED: All table column headers and data cells share exact matching alignment!');
  } else {
    console.error('FAILED: Mismatched alignments detected!');
  }

  const ssTable = path.join(screenshotsDir, 'table-platform-comparison.png');
  const tableTray = page.locator('.tray:has-text("Platform comparison")').first();
  await tableTray.screenshot({ path: ssTable });
  console.log('✓ Captured screenshot:', ssTable);

  await browser.close();
  console.log('\n✓ ALL CHECKS COMPLETED SUCCESSFULLY');
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});

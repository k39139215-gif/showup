import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = 'C:\\Users\\kartik\\.gemini\\antigravity\\scratch\\social-dashboard\\public\\brand';
const artifactDir = 'C:\\Users\\kartik\\.gemini\\antigravity\\brain\\9421b64f-751c-4faa-83cb-b281fdd9f0d7';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });

  for (const name of ['linkedin-logo', 'verasett-app-logo']) {
    const svgFile = path.join(outDir, `${name}.svg`);
    const pngFile = path.join(outDir, `${name}.png`);
    const artPng = path.join(artifactDir, `${name}.png`);

    const svgContent = fs.readFileSync(svgFile, 'utf8');
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;width:400px;height:400px;">${svgContent}</body></html>`);
    
    await page.screenshot({ path: pngFile, omitBackground: true });
    fs.copyFileSync(pngFile, artPng);
    console.log(`Generated: ${pngFile} & ${artPng}`);
  }

  await browser.close();
}

run().catch(console.error);

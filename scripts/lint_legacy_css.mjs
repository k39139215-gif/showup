import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const legacyCssPath = path.resolve(__dirname, '../src/styles/legacy.css');

console.log('=== Checking legacy.css for bare element selectors ===\n');

const css = fs.readFileSync(legacyCssPath, 'utf8');

// Strip comments and media queries for rule extraction
const strippedCss = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Extract selector blocks
const ruleBlocks = strippedCss.match(/[^{}]+(?=\{)/g) || [];

const DISALLOWED_BARE = [
  'button',
  'input',
  'select',
  'textarea',
  'a',
  'table',
  'th',
  'td',
  'ul',
  'li',
  'kbd',
  'dialog',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
];

const violations = [];

for (const rawSel of ruleBlocks) {
  const selectors = rawSel.split(',').map((s) => s.trim());
  for (const sel of selectors) {
    if (!sel || sel.startsWith('@') || sel.startsWith(':root')) continue;

    // Check if the selector starts with a disallowed bare element without class/id/context scoping
    for (const bare of DISALLOWED_BARE) {
      const bareRegex = new RegExp(`^${bare}(\\s*[:\\[\\s]|$)`);
      if (bareRegex.test(sel) && !sel.includes('.legacy-ui')) {
        violations.push({ selector: sel, bareElement: bare });
      }
    }
  }
}

if (violations.length > 0) {
  console.error('❌ FAILED: Found bare element selectors in legacy.css outside .legacy-ui:');
  for (const v of violations) {
    console.error(`  - "${v.selector}" (bare element: <${v.bareElement}>)`);
  }
  process.exit(1);
} else {
  console.log('✓ PASSED: Zero bare element selectors found in legacy.css outside .legacy-ui');
  process.exit(0);
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-load .env from base directory
try {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach((l) => {
      const idx = l.indexOf('=');
      if (idx !== -1) {
        const k = l.slice(0, idx).trim();
        const v = l.slice(idx + 1).trim();
        if (k && !process.env[k]) process.env[k] = v;
      }
    });
  }
} catch (e) {}

import { syncXPublicProfile } from './sync-x-public.mjs';
import { syncLinkedInProfile } from './sync-linkedin.mjs';

async function main() {
  console.log('====================================================');
  console.log('⚡ ShowUp Universal Auto-Sync Starting');
  console.log('====================================================');

  // 1. Sync X (Twitter)
  try {
    console.log('\n--- 1. Syncing X (Twitter) ---');
    await syncXPublicProfile();
  } catch (err) {
    console.warn('⚠️ X Sync warning:', err.message);
  }

  // 2. Sync LinkedIn via Apify Cloud REST
  try {
    console.log('\n--- 2. Syncing LinkedIn ---');
    await syncLinkedInProfile();
  } catch (err) {
    console.warn('⚠️ LinkedIn Sync warning:', err.message);
  }

  console.log('\n====================================================');
  console.log('🎉 ShowUp Universal Auto-Sync Finished');
  console.log('====================================================');
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
});

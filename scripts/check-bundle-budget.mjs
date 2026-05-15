#!/usr/bin/env node
// Bundle-size gate per spec 012 / FR-006.
// Reads frontend/dist after `pnpm build` and asserts:
//   - home-route initial JS bundle < 250 KB gzipped
//   - no single chunk > 200 KB gzipped
// Exits non-zero on any violation.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const DIST = resolve(process.cwd(), 'frontend/dist/assets');
const HOME_BUDGET = 250 * 1024;
const CHUNK_BUDGET = 200 * 1024;

if (!statSync(DIST, { throwIfNoEntry: false })) {
  console.error(`No build output at ${DIST}. Run \`pnpm --filter frontend build\` first.`);
  process.exit(2);
}

const entries = readdirSync(DIST)
  .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
  .map((f) => {
    const buf = readFileSync(join(DIST, f));
    const gz = gzipSync(buf).length;
    return { file: f, gz };
  })
  .sort((a, b) => b.gz - a.gz);

console.log('Chunk sizes (gzipped):');
for (const e of entries) {
  console.log(`  ${(e.gz / 1024).toFixed(1).padStart(7)} KB  ${e.file}`);
}

let failed = false;

// Home initial = entry index-*.js + react-vendor + entry css
const homeEntry = entries.find((e) => /^index-[A-Za-z0-9_-]+\.js$/.test(e.file));
const vendor = entries.find((e) => e.file.startsWith('react-vendor'));
const css = entries.find((e) => e.file.endsWith('.css'));
const homeTotal = (homeEntry?.gz ?? 0) + (vendor?.gz ?? 0) + (css?.gz ?? 0);
console.log(`\nHome initial total: ${(homeTotal / 1024).toFixed(1)} KB (budget ${(HOME_BUDGET / 1024).toFixed(0)} KB)`);
if (homeTotal > HOME_BUDGET) {
  console.error(`FAIL: home initial bundle exceeds budget by ${((homeTotal - HOME_BUDGET) / 1024).toFixed(1)} KB`);
  failed = true;
}

for (const e of entries.filter((x) => x.file.endsWith('.js'))) {
  if (e.gz > CHUNK_BUDGET) {
    console.error(`FAIL: chunk ${e.file} (${(e.gz / 1024).toFixed(1)} KB gz) exceeds ${(CHUNK_BUDGET / 1024).toFixed(0)} KB budget`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log('\nBundle budgets OK.');

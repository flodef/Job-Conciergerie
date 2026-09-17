#!/usr/bin/env bun
/**
 * seed-demo.ts — seed (or reset) the demo database (Phase E).
 *
 * Usage:
 *   DEMO_DATABASE_URL=postgres://... bun scripts/seed-demo.ts
 *   bun scripts/seed-demo.ts --db-url postgres://...
 *   bun scripts/seed-demo.ts --db-url <url> --check   # only report seed age
 *
 * The target is the DEDICATED demo database — never production
 * (seedDemoDatabase refuses URLs containing PROD_SUPABASE_PROJECT_ID).
 */

import { demoSeedAgeMs, DEMO_STALE_AFTER_MS, seedDemoDatabase } from '@/app/db/demoSeed';

const argv = process.argv.slice(2);
const flagValue = (name: string) => {
  const i = argv.indexOf(name);
  return i !== -1 && i + 1 < argv.length ? argv[i + 1] : null;
};

const url = flagValue('--db-url') ?? process.env.DEMO_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('✗ No database URL — pass --db-url or set DEMO_DATABASE_URL.');
  process.exit(1);
}

if (argv.includes('--check')) {
  const age = await demoSeedAgeMs(url);
  console.log(
    age === null
      ? 'Demo database is empty (never seeded).'
      : `Seed age: ${(age / 3600000).toFixed(1)}h (stale after ${DEMO_STALE_AFTER_MS / 3600000}h)`,
  );
  process.exit(0);
}

console.log('→ Resetting schema and seeding demo data…');
const summary = await seedDemoDatabase(url);
console.log('✓ Demo database seeded:', JSON.stringify(summary));
console.log('  Demo entry: open the magic link on https://demo.job-conciergerie.fr');

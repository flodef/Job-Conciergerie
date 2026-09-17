import { demoSeedAgeMs, seedDemoDatabase } from '@/app/db/demoSeed';
import { DEMO_URL } from '@/app/utils/demo';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/demo/enter — the landing's "Essayer la démo" link navigates here:
 * the demo database is reset to a clean seed, then the visitor is redirected
 * to the public demo credential (/<id> adopts it on any browser).
 *
 * Public by design — resetting the demo IS the desired outcome (same pattern
 * as Tradiz). Two bounds: a seed younger than MIN_INTERVAL skips the wipe, so
 * a second click can't erase a tester who just started, and abuse costs at
 * most one reseed per interval.
 *
 * Direct visits to demo.<domain> never hit this route — no reset.
 */
const MIN_INTERVAL_MS = 15 * 60_000;

export async function GET() {
  const url = process.env.DEMO_DATABASE_URL;
  if (!url) return NextResponse.json({ error: 'DEMO_DATABASE_URL is not set' }, { status: 503 });

  try {
    const age = await demoSeedAgeMs(url);
    if (age === null || age > MIN_INTERVAL_MS) await seedDemoDatabase(url);
    return NextResponse.redirect(DEMO_URL, 303);
  } catch (error) {
    console.error('Demo reset failed:', error);
    return NextResponse.json({ error: 'Demo reset failed' }, { status: 500 });
  }
}

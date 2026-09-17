import { demoSeedAgeMs, DEMO_STALE_AFTER_MS, seedDemoDatabase } from '@/app/db/demoSeed';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/demo/reset — reseeds the demo database.
 *
 * Auth: `Authorization: Bearer $CRON_SECRET` (Vercel cron) or `?key=$DEMO_RESET_KEY`.
 * Always targets DEMO_DATABASE_URL explicitly — the request host is irrelevant,
 * and seedDemoDatabase refuses a URL that looks like production.
 *
 * Lazy mode (default): only reseeds when the data is older than 12h.
 * `?force=1` bypasses the staleness check.
 */
async function handle(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const resetKey = process.env.DEMO_RESET_KEY;
  const bearer = request.headers.get('authorization');
  const key = request.nextUrl.searchParams.get('key');

  const authorized = (cronSecret && bearer === `Bearer ${cronSecret}`) || (resetKey && key === resetKey);
  if (!authorized) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = process.env.DEMO_DATABASE_URL;
  if (!url) return NextResponse.json({ error: 'DEMO_DATABASE_URL is not set' }, { status: 503 });

  try {
    const force = request.nextUrl.searchParams.get('force') === '1';
    const age = await demoSeedAgeMs(url);
    if (!force && age !== null && age < DEMO_STALE_AFTER_MS)
      return NextResponse.json({ skipped: true, ageHours: Math.round(age / 360000) / 10 });

    const summary = await seedDemoDatabase(url);
    return NextResponse.json({ reseeded: true, ...summary });
  } catch (error) {
    console.error('Demo reset failed:', error);
    return NextResponse.json({ error: 'Demo reset failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}
export async function POST(request: NextRequest) {
  return handle(request);
}

import { headers } from 'next/headers';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';

// Dedicated secret recommended (CONTACT_FORM_SECRET); falls back to a
// per-process random secret so tokens can't be forged across restarts.
// `||` (not `??`): an empty env var must also fall back.
const SECRET = process.env.CONTACT_FORM_SECRET || randomBytes(32).toString('hex');

const MIN_FILL_MS = 3_000; // a human can't fill the form faster than this
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000;

const sign = (ts: string) => createHmac('sha256', SECRET).update(ts).digest('hex');

export function issueFormToken(): string {
  const ts = Date.now().toString();
  return `${ts}.${sign(ts)}`;
}

// Server-signed timestamp token — no client-supplied data (timezone, UA, ...)
// is ever trusted.
export function isFormTokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const [ts, sig] = token.split('.');
  if (!ts || !sig || !/^\d+$/.test(ts)) return false;
  const expected = Buffer.from(sign(ts), 'utf8');
  const actual = Buffer.from(sig, 'utf8');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  const age = Date.now() - Number(ts);
  return age >= MIN_FILL_MS && age <= MAX_TOKEN_AGE_MS;
}

// Only proxy-provided headers are trusted. On Netlify the platform sets
// x-nf-client-connection-ip and strips client-supplied copies. The LAST
// x-forwarded-for entry is the one appended by the nearest trusted edge —
// earlier entries are client-controlled and must not be trusted.
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const nf = h.get('x-nf-client-connection-ip');
  if (nf) return nf.trim();
  const real = h.get('x-real-ip');
  if (real) return real.trim();
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

const runtimeBlocked = new Set<string>();
export function blockIp(ip: string) {
  runtimeBlocked.add(ip);
}

// Fails CLOSED: if the blocklist can't be evaluated, the request is denied
// rather than allowed through.
export function isIpBlocked(ip: string): boolean {
  try {
    const envBlocked = (process.env.CONTACT_BLOCKED_IPS ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    return runtimeBlocked.has(ip) || envBlocked.includes(ip);
  } catch (err) {
    console.error('isIpBlocked failed — denying request:', err);
    return true;
  }
}

// In-memory rate limiter (per instance — a speed bump, not a guarantee).
const hits = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const LIMITS = { contact: 5, order: 10 } as const;

export function isRateLimited(ip: string, kind: keyof typeof LIMITS): boolean {
  try {
    const now = Date.now();
    const key = `${kind}:${ip}`;
    const list = (hits.get(key) ?? []).filter(t => now - t < WINDOW_MS);
    hits.set(key, list);
    if (list.length >= LIMITS[kind]) return true;
    list.push(now);
    return false;
  } catch (err) {
    console.error('rate limiter failed — denying request:', err);
    return true;
  }
}

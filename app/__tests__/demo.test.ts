import { isDemoRequest } from '@/app/db/db';
import { afterEach, describe, expect, it, vi } from 'vitest';

// headers() is the only request-context dependency of isDemoRequest
vi.mock('next/headers', () => ({
  headers: vi.fn(),
  cookies: vi.fn(),
}));

import { headers } from 'next/headers';
const mockHeaders = vi.mocked(headers);

const withHeaders = (entries: Record<string, string>) => mockHeaders.mockResolvedValue(new Headers(entries) as never);

afterEach(() => mockHeaders.mockReset());

describe('isDemoRequest (Phase E)', () => {
  it('detects the demo host header', async () => {
    await withHeaders({ host: 'demo.job-conciergerie.fr' });
    expect(await isDemoRequest()).toBe(true);
  });

  it('detects the x-demo marker set by proxy.ts', async () => {
    await withHeaders({ host: 'app.job-conciergerie.fr', 'x-demo': '1' });
    expect(await isDemoRequest()).toBe(true);
  });

  it('is false on the app and site hosts', async () => {
    for (const host of [
      'app.job-conciergerie.fr',
      'www.job-conciergerie.fr',
      'job-conciergerie.fr',
      'localhost:3000',
    ]) {
      await withHeaders({ host });
      expect(await isDemoRequest()).toBe(false);
    }
  });

  it('is false outside a request context (scripts, tests)', async () => {
    mockHeaders.mockRejectedValue(new Error('outside request'));
    expect(await isDemoRequest()).toBe(false);
  });
});

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Dev-only: demo.localhost resolves to loopback in browsers AND counts as
  // a secure context (crypto.subtle works → client-side id hashing OK) while
  // mimicking the demo.<domain> host for proxy.ts (`demo.` prefix).
  allowedDevOrigins: ['demo.localhost', 'demo.localtest.me'],
  experimental: {
    // Route groups ((app) / (site)) have no shared root layout — the global
    // 404 must be rendered by app/global-not-found.tsx instead.
    globalNotFound: true,
  },
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wztgngibrkdqelsdphjt.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
        search: '',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
        search: '',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
  },
};

// PWA: public/sw.js is a hand-maintained file served as-is — the Serwist
// webpack plugin never ran under Turbopack builds, so it was removed.
export default nextConfig;

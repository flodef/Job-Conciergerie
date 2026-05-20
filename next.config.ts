import type { NextConfig } from 'next';
import withSerwist from '@serwist/next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  outputFileTracingRoot: '/home/flo/Github/job-conciergerie',
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

// Only enable PWA in production to prevent dev memory leaks
const withPWA = isDev
  ? (config: NextConfig) => config
  : withSerwist({
      swSrc: 'app/sw.ts',
      swDest: 'public/sw.js',
    });

export default withPWA(nextConfig);

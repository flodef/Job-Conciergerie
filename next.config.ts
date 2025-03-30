import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_GATEWAY_DOMAIN || '',
        port: '',
        pathname: '/ipfs/**',
        search: '',
      },
    ],
  },
};

export default nextConfig;

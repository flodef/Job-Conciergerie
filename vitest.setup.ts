import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://wztgngibrkdqelsdphjt.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_DEJLQNehSzbR4zTqEBeN7A_JXMMQ5P0';
process.env.IPFS_JWT = 'test-jwt';
process.env.NEXT_PUBLIC_IPFS_API_URL = 'https://api.pinata.cloud/v3/files';
process.env.NEXT_PUBLIC_IPFS_PUBLIC_URL = 'https://api.pinata.cloud/v3/files/';
process.env.NEXT_PUBLIC_GATEWAY_DOMAIN = 'https://gateway.pinata.cloud';

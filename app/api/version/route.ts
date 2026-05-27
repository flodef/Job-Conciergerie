import packageJson from '@/package.json';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ version: packageJson.version });
}

import { NextResponse, NextRequest } from 'next/server';

const IPFS_JWT = process.env.IPFS_JWT;
const IPFS_API_URL = process.env.NEXT_PUBLIC_IPFS_API_URL; // Pinata API endpoint for pinning files

export async function POST(request: NextRequest) {
  if (!IPFS_JWT || !IPFS_API_URL) {
    console.error('IPFS environment variables not configured');
    return NextResponse.json({ error: 'IPFS environment variables not configured' }, { status: 500 });
  }

  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const formData = new FormData();
    formData.append('file', file, file.name); // Important to include filename
    formData.append('network', 'public');

    const res = await fetch(IPFS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${IPFS_JWT}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`Pinata API Error (${res.status}):`, errorBody.slice(0, 500)); // Log truncated error
      return NextResponse.json(
        {
          error: `Failed to upload file to IPFS: ${res.statusText}`,
          details: errorBody,
        },
        { status: res.status },
      );
    }

    const result = await res.json();

    if (!result.data || !result.data.cid) {
      console.error('Pinata response missing data.cid:', result);
      return NextResponse.json({ error: 'Failed to get CID from Pinata response' }, { status: 500 });
    }

    return NextResponse.json({ cid: result.data.cid }, { status: 200 });
  } catch (error) {
    console.error('Error in /api/IPFS POST:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: 'Error processing file upload', details: errorMessage }, { status: 500 });
  }
}

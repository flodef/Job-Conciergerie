import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to revalidate cache tags
 * POST /api/revalidate?tag=conciergeries
 */
export async function POST(request: NextRequest) {
  const tag = request.nextUrl.searchParams.get('tag');
  
  if (!tag) {
    return NextResponse.json(
      { message: 'Missing tag parameter' },
      { status: 400 }
    );
  }

  try {
    // Revalidate the provided tag
    revalidateTag(tag);
    
    return NextResponse.json(
      { revalidated: true, message: `Cache for tag '${tag}' revalidated` },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error revalidating tag '${tag}':`, error);
    return NextResponse.json(
      { revalidated: false, message: `Error revalidating tag '${tag}'` },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { searchSeeds } from '@/lib/neutron-cli';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, limit = 10, threshold = 0.5 } = body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      );
    }

    const data = await searchSeeds(query.trim(), limit, threshold);

    return NextResponse.json({
      success: true,
      results: data.results || [],
      count: (data.results || []).length
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

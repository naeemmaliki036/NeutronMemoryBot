import { NextResponse } from 'next/server';
import { searchSeeds, saveSeed } from '@/lib/neutron-cli';

export async function GET() {
  try {
    // Search for recent memories (broad query)
    const data = await searchSeeds('*', 20, 0.0);

    return NextResponse.json({
      success: true,
      memories: data.results || [],
      total: data.results?.length || 0
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data: memoryData, title } = body;

    const textContent = typeof memoryData === 'string'
      ? memoryData
      : JSON.stringify(memoryData);

    const result = await saveSeed(textContent, title || 'Manual memory');

    return NextResponse.json({
      success: true,
      memory: result
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

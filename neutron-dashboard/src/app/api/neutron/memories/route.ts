import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { saveTextAsSeed } from '@/lib/neutron-seeds';

export async function GET() {
  try {
    const url = `${config.neutron.baseUrl}/agent-contexts?appId=${config.neutron.appId}&externalUserId=neutron-memory-bot&agentId=NeutronMemoryBot`;

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.neutron.apiKey}`
      },
      cache: 'no-store'
    });

    const data = await res.json();

    return NextResponse.json({
      success: true,
      memories: data.items || [],
      total: data.total || 0
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
    const { memoryType, data: memoryData } = body;

    const url = `${config.neutron.baseUrl}/agent-contexts?appId=${config.neutron.appId}&externalUserId=neutron-memory-bot`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.neutron.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId: 'NeutronMemoryBot',
        memoryType: memoryType || 'episodic',
        data: memoryData
      })
    });

    const data = await res.json();

    // Also save as seed for semantic search (fire-and-forget)
    const textContent = typeof memoryData === 'string'
      ? memoryData
      : JSON.stringify(memoryData);
    saveTextAsSeed(textContent, `Memory: ${memoryType || 'episodic'}`).catch(() => {});

    return NextResponse.json({
      success: true,
      memory: data
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

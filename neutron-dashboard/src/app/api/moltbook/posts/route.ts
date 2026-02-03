import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

const POST_IDS = [
  'b6b51aae-f7fb-45a3-aa32-d4745f6025ef',
  'b1dbf53c-cdc2-4b2c-b9e8-3deb088ee701'
];

export async function GET() {
  try {
    const posts = await Promise.all(
      POST_IDS.map(async (postId) => {
        const res = await fetch(`${config.moltbook.baseUrl}/posts/${postId}`, {
          headers: {
            'Authorization': `Bearer ${config.moltbook.apiKey}`
          },
          cache: 'no-store'
        });
        const data = await res.json();
        return data.success ? data.post : null;
      })
    );

    return NextResponse.json({
      success: true,
      posts: posts.filter(Boolean)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

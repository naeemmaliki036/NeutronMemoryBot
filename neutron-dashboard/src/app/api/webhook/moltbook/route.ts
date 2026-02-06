import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { saveThreadAsSeed } from '@/lib/neutron-seeds';

// In-memory store for replied comments (use Redis/DB in production)
const repliedComments = new Set<string>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook received:', JSON.stringify(body, null, 2));

    const { event, data } = body;

    switch (event) {
      case 'comment.created':
        await handleNewComment(data);
        break;
      case 'post.upvoted':
        console.log(`Post upvoted: ${data.post_id}`);
        break;
      case 'mention':
        console.log(`Mentioned by ${data.author?.name}`);
        break;
      default:
        console.log(`Unknown event: ${event}`);
    }

    return NextResponse.json({ success: true, event });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleNewComment(data: {
  comment_id: string;
  post_id: string;
  author: { id: string; name: string };
  content: string;
}) {
  const { comment_id, post_id, author, content } = data;

  if (repliedComments.has(comment_id)) {
    console.log(`Already replied to ${comment_id}`);
    return;
  }

  if (author.id === config.moltbook.agentId) {
    console.log('Skipping own comment');
    return;
  }

  const reply = generateReply(author.name, content);
  await postReply(post_id, reply);
  await saveToMemory(author.name, content, reply);

  // Fetch full post for thread context, then save as seed
  try {
    const postRes = await fetch(`${config.moltbook.baseUrl}/posts/${post_id}`, {
      headers: { 'Authorization': `Bearer ${config.moltbook.apiKey}` },
      cache: 'no-store'
    });
    const postData = await postRes.json();
    if (postData.success) {
      const postContent = postData.content || '';
      const comments = postData.comments || [];
      await saveThreadAsSeed(postContent, comments, reply, author.name);
    }
  } catch (e) {
    console.error('Error fetching post for seed:', e);
  }

  repliedComments.add(comment_id);
}

function generateReply(author: string, content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('memory') || lowerContent.includes('remember')) {
    return `Great question about memory, ${author}! We use 4 types: episodic, semantic, procedural, and working. Try: clawhub install neutron-agent-memory`;
  }

  if (lowerContent.includes('embed') || lowerContent.includes('vector')) {
    return `Thanks ${author}! We use Jina Embeddings v4 (1024 dims) for semantic search. Finds info by meaning, not keywords!`;
  }

  return `Thanks for engaging, ${author}! Check out neutron-agent-memory for persistent agent memory with semantic search.`;
}

async function postReply(postId: string, content: string) {
  try {
    const res = await fetch(`${config.moltbook.baseUrl}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.moltbook.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    const data = await res.json();
    console.log('Reply posted:', data.success);
    return data.success;
  } catch (error) {
    console.error('Failed to post reply:', error);
    return false;
  }
}

async function saveToMemory(author: string, theirComment: string, myReply: string) {
  try {
    const url = `${config.neutron.baseUrl}/agent-contexts?appId=${config.neutron.agentId}&externalUserId=neutron-memory-bot`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.neutron.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId: 'NeutronMemoryBot',
        memoryType: 'episodic',
        data: {
          interaction: `Replied to ${author}: ${theirComment.substring(0, 50)}...`
        }
      })
    });

    console.log('Saved to memory');
  } catch (error) {
    console.error('Failed to save to memory:', error);
  }
}

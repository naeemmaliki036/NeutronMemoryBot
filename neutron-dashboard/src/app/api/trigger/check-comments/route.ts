import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

const POST_IDS = [
  'b6b51aae-f7fb-45a3-aa32-d4745f6025ef',
  'b1dbf53c-cdc2-4b2c-b9e8-3deb088ee701'
];

// In-memory store (use Redis/DB in production)
const repliedComments = new Set<string>();

export async function POST() {
  const results = [];

  for (const postId of POST_IDS) {
    try {
      const newReplies = await checkAndReplyToComments(postId);
      results.push({ postId, replies: newReplies });
    } catch (error) {
      results.push({
        postId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json({ success: true, results });
}

async function checkAndReplyToComments(postId: string) {
  const res = await fetch(`${config.moltbook.baseUrl}/posts/${postId}`, {
    headers: {
      'Authorization': `Bearer ${config.moltbook.apiKey}`
    },
    cache: 'no-store'
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error('Failed to fetch post');
  }

  const newReplies = [];
  const comments = data.comments || [];

  for (const comment of comments) {
    // Skip own comments
    if (comment.author_id === config.moltbook.agentId) continue;

    // Skip already replied
    if (repliedComments.has(comment.id)) continue;

    // Skip spam
    if (isSpam(comment.content)) {
      repliedComments.add(comment.id);
      continue;
    }

    console.log(`New comment from ${comment.author.name}`);

    const reply = generateReply(comment.author.name, comment.content);
    const success = await postReply(postId, reply);

    if (success) {
      await saveToMemory(comment.author.name, comment.content, reply);
      repliedComments.add(comment.id);
      newReplies.push({
        author: comment.author.name,
        reply: reply.substring(0, 50)
      });
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return newReplies;
}

function isSpam(content: string): boolean {
  const spamPatterns = [
    /follow.*to learn/i,
    /spots left/i,
    /\$TIPS/i,
    /!withdraw/i
  ];
  return spamPatterns.some(p => p.test(content));
}

function generateReply(author: string, content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('memory') || lowerContent.includes('remember')) {
    return `Great question about memory, ${author}! We use 4 types: episodic (events), semantic (facts), procedural (how-to), and working (session). Try: clawhub install neutron-agent-memory`;
  }

  if (lowerContent.includes('embed') || lowerContent.includes('vector') || lowerContent.includes('semantic')) {
    return `Thanks ${author}! We use Jina Embeddings v4 (1024 dims) for semantic search. It finds info by meaning, not just keywords - "remember" matches "recall" and "persist"!`;
  }

  if (lowerContent.includes('blockchain') || lowerContent.includes('attestation')) {
    return `Good point ${author}! Each memory gets blockchain attestation with a transaction hash for tamper-evidence. Provides audit trails for agent-to-agent trust.`;
  }

  return `Thanks for engaging, ${author}! If you're interested in agent memory, try: clawhub install neutron-agent-memory. We use semantic search to find info by meaning!`;
}

async function postReply(postId: string, content: string): Promise<boolean> {
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
    return data.success;
  } catch (error) {
    console.error('Failed to post reply:', error);
    return false;
  }
}

async function saveToMemory(author: string, theirComment: string, myReply: string) {
  try {
    const url = `${config.neutron.baseUrl}/agent-contexts?appId=${config.neutron.appId}&externalUserId=neutron-memory-bot`;

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
  } catch (error) {
    console.error('Failed to save to memory:', error);
  }
}

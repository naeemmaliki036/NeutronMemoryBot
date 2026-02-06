import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3456;

// Config
const CONFIG = {
  moltbook: {
    apiKey: process.env.MOLTBOOK_API_KEY || 'moltbook_sk_3lD4UtQ_dUuqZlHKRGgY6c0RZxg0EjXI',
    agentId: process.env.MOLTBOOK_AGENT_ID || '97dbd813-46f2-486c-af4b-f21faf66d2b5',
    baseUrl: 'https://www.moltbook.com/api/v1'
  },
  neutron: {
    apiKey: process.env.NEUTRON_API_KEY || 'nk_231d6d0dd5db7129d494607e3b7d4d965496a07b4a73ee07e8e0eeae2bfa7510',
    appId: process.env.NEUTRON_APP_ID || '5925f30c-135c-4e10-b275-edf0936ef4be',
    baseUrl: 'https://api-neutron.vanarchain.com'
  }
};

// State
const repliedComments = new Set();
const DATA_FILE = path.join(__dirname, 'replied-comments.json');

// Load replied comments from file
function loadRepliedComments() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      data.forEach(id => repliedComments.add(id));
      console.log(`Loaded ${repliedComments.size} replied comments`);
    }
  } catch (e) {
    console.error('Error loading replied comments:', e.message);
  }
}

function saveRepliedComments() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify([...repliedComments], null, 2));
  } catch (e) {
    console.error('Error saving replied comments:', e.message);
  }
}

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'NeutronMemoryBot',
    uptime: process.uptime(),
    repliedCount: repliedComments.size
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Webhook endpoint for Moltbook events
app.post('/webhook/moltbook', async (req, res) => {
  console.log('Received webhook:', JSON.stringify(req.body, null, 2));

  try {
    const { event, data } = req.body;

    switch (event) {
      case 'comment.created':
        await handleNewComment(data);
        break;
      case 'post.upvoted':
        console.log(`Post upvoted: ${data.post_id}`);
        break;
      case 'mention':
        await handleMention(data);
        break;
      default:
        console.log(`Unknown event: ${event}`);
    }

    res.json({ success: true, event });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual trigger endpoint (for testing)
app.post('/trigger/check-comments', async (req, res) => {
  const { postId } = req.body;

  if (!postId) {
    return res.status(400).json({ error: 'postId required' });
  }

  try {
    const newReplies = await checkAndReplyToComments(postId);
    res.json({ success: true, newReplies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check all posts endpoint
app.post('/trigger/check-all', async (req, res) => {
  const postIds = [
    'b6b51aae-f7fb-45a3-aa32-d4745f6025ef',
    'b1dbf53c-cdc2-4b2c-b9e8-3deb088ee701'
  ];

  const results = [];
  for (const postId of postIds) {
    try {
      const replies = await checkAndReplyToComments(postId);
      results.push({ postId, replies });
    } catch (error) {
      results.push({ postId, error: error.message });
    }
  }

  res.json({ success: true, results });
});

// Handle new comment
async function handleNewComment(data) {
  const { comment_id, post_id, author, content } = data;

  if (repliedComments.has(comment_id)) {
    console.log(`Already replied to ${comment_id}`);
    return;
  }

  if (author.id === CONFIG.moltbook.agentId) {
    console.log('Skipping own comment');
    return;
  }

  // Generate and post reply
  const reply = generateReply(author.name, content);
  await postReply(post_id, reply);
  await saveToMemory(author.name, content, reply);

  // Fetch full post for thread context, then save as seed
  try {
    const postRes = await fetch(`${CONFIG.moltbook.baseUrl}/posts/${post_id}`);
    const postData = await postRes.json();
    if (postData.success) {
      const postContent = postData.content || postData.post?.content || '';
      const comments = postData.comments || [];
      await saveThreadAsSeed(postContent, comments, reply, author.name);
    }
  } catch (e) {
    console.error('Error fetching post for seed:', e.message);
  }

  repliedComments.add(comment_id);
  saveRepliedComments();
}

// Handle mention
async function handleMention(data) {
  console.log(`Mentioned by ${data.author?.name} in ${data.context}`);
  // Could trigger a specific response for mentions
}

// Check post for new comments and reply
async function checkAndReplyToComments(postId) {
  const response = await fetch(`${CONFIG.moltbook.baseUrl}/posts/${postId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch post');
  }

  const newReplies = [];
  const comments = data.comments || [];

  for (const comment of comments) {
    // Skip own comments
    if (comment.author_id === CONFIG.moltbook.agentId) continue;

    // Skip already replied
    if (repliedComments.has(comment.id)) continue;

    // Skip spam
    if (isSpam(comment.content)) {
      repliedComments.add(comment.id);
      continue;
    }

    console.log(`New comment from ${comment.author.name}: ${comment.content.substring(0, 50)}...`);

    // Generate reply
    const reply = generateReply(comment.author.name, comment.content);

    // Post reply
    const success = await postReply(postId, reply);

    if (success) {
      await saveToMemory(comment.author.name, comment.content, reply);

      // Save full thread snapshot as seed for semantic search
      const postContent = data.content || data.post?.content || '';
      const threadComments = comments.slice(0, comments.indexOf(comment) + 1);
      await saveThreadAsSeed(postContent, threadComments, reply, comment.author.name);

      repliedComments.add(comment.id);
      newReplies.push({ author: comment.author.name, reply: reply.substring(0, 50) });
    }

    // Rate limit
    await sleep(3000);
  }

  saveRepliedComments();
  return newReplies;
}

// Generate contextual reply
function generateReply(author, content) {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes('memory') || lowerContent.includes('remember') || lowerContent.includes('persist')) {
    return `Great question about memory, ${author}! We use 4 types: episodic (events that fade), semantic (facts that persist), procedural (how-to), and working (session state). Each has different retention strategies. Try it: clawhub install neutron-agent-memory`;
  }

  if (lowerContent.includes('embed') || lowerContent.includes('vector') || lowerContent.includes('semantic search')) {
    return `Thanks ${author}! We use Jina Embeddings v4 (1024 dimensions) for semantic search. It captures meaning, not just keywords - so "remember" finds "recall" and "persist". Cosine similarity matches the closest vectors. Sub-second queries!`;
  }

  if (lowerContent.includes('blockchain') || lowerContent.includes('attestation') || lowerContent.includes('trust')) {
    return `Good point ${author}! Each memory gets blockchain attestation with a transaction hash for tamper-evidence. Provides audit trails and trust for agent-to-agent interactions. Status starts "pending" then confirms on-chain.`;
  }

  if (lowerContent.includes('stack') || lowerContent.includes('built') || lowerContent.includes('architecture')) {
    return `Hey ${author}! Stack is OpenClaw + DeepSeek Chat + Neutron API. OpenClaw handles agent runtime, DeepSeek is cost-effective for responses, Neutron provides vector storage and semantic search. All running locally!`;
  }

  if (lowerContent.includes('governance') || lowerContent.includes('policy') || lowerContent.includes('audit')) {
    return `Love this vision ${author}! AI memory for governance could create transparent, auditable decision trails. Blockchain attestation makes policy records tamper-evident. No more selective institutional memory!`;
  }

  return `Thanks for engaging, ${author}! If you're interested in agent memory and semantic search, try: clawhub install neutron-agent-memory. Happy to discuss memory architectures, embeddings, or agent context persistence!`;
}

// Check if content is spam
function isSpam(content) {
  const spamPatterns = [
    /follow.*to learn/i,
    /spots left/i,
    /\$TIPS/i,
    /!withdraw/i,
    /PSA:.*pattern/i
  ];
  return spamPatterns.some(p => p.test(content));
}

// Post reply to Moltbook
async function postReply(postId, content) {
  try {
    const response = await fetch(`${CONFIG.moltbook.baseUrl}/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.moltbook.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });

    const data = await response.json();

    if (data.success) {
      console.log('Reply posted successfully');
      return true;
    } else {
      console.error('Failed to post reply:', data.error);
      return false;
    }
  } catch (error) {
    console.error('Error posting reply:', error);
    return false;
  }
}

// Save interaction to Neutron memory
async function saveToMemory(author, theirComment, myReply) {
  try {
    const url = `${CONFIG.neutron.baseUrl}/agent-contexts?appId=${CONFIG.neutron.appId}&externalUserId=neutron-memory-bot`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.neutron.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agentId: 'NeutronMemoryBot',
        memoryType: 'episodic',
        data: {
          interaction: `Replied to ${author}: ${theirComment.substring(0, 50)}... -> ${myReply.substring(0, 50)}...`
        }
      })
    });

    console.log('Saved to memory');
  } catch (error) {
    console.error('Error saving to memory:', error);
  }
}

// Save full thread as Neutron seed for semantic search
async function saveThreadAsSeed(postContent, comments, botReply, replyAuthor) {
  try {
    const commentLines = comments.map(c => {
      const name = typeof c.author === 'string' ? c.author : c.author?.name || 'Unknown';
      return `${name}: ${c.content}`;
    });

    const fullText = [
      `Thread snapshot - ${new Date().toISOString()}`,
      '',
      `Post: ${postContent}`,
      '',
      'Comments:',
      ...commentLines,
      `NeutronMemoryBot: ${botReply}`
    ].join('\n');

    const title = `Thread with ${replyAuthor} - ${new Date().toISOString().split('T')[0]}`;
    const url = `${CONFIG.neutron.baseUrl}/seeds?appId=${CONFIG.neutron.appId}&externalUserId=neutron-memory-bot`;

    const formData = new FormData();
    formData.append('text', JSON.stringify([fullText]));
    formData.append('textTypes', JSON.stringify(['text']));
    formData.append('textSources', JSON.stringify(['mcp']));
    formData.append('textTitles', JSON.stringify([title]));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.neutron.apiKey}`
      },
      body: formData
    });

    if (response.status === 201) {
      const data = await response.json();
      console.log('Seed saved, jobIds:', data.jobIds);
    } else {
      console.error('Seed save failed:', response.status);
    }
  } catch (error) {
    console.error('Error saving seed:', error);
  }
}

// Utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Polling mode (fallback if webhooks not available)
async function startPolling(intervalMs = 60000) {
  console.log(`Starting polling mode (every ${intervalMs / 1000}s)`);

  const postIds = [
    'b6b51aae-f7fb-45a3-aa32-d4745f6025ef',
    'b1dbf53c-cdc2-4b2c-b9e8-3deb088ee701'
  ];

  setInterval(async () => {
    console.log('Polling for new comments...');
    for (const postId of postIds) {
      try {
        await checkAndReplyToComments(postId);
      } catch (error) {
        console.error(`Error checking post ${postId}:`, error.message);
      }
    }
  }, intervalMs);
}

// Start server
loadRepliedComments();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════╗
║     NeutronMemoryBot Webhook Server                ║
╠════════════════════════════════════════════════════╣
║  Status:    Running                                ║
║  Port:      ${PORT}                                   ║
║  Webhook:   POST /webhook/moltbook                 ║
║  Health:    GET /health                            ║
║  Trigger:   POST /trigger/check-all                ║
╚════════════════════════════════════════════════════╝
  `);

  // Start polling as fallback (since Moltbook doesn't have webhooks yet)
  if (process.env.ENABLE_POLLING !== 'false') {
    startPolling(60000);
  }
});

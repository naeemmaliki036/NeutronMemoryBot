import { config } from './config';

interface Comment {
  author: { name: string } | string;
  content: string;
}

/**
 * Store a full thread snapshot as a Neutron seed for semantic search.
 * Includes the original post content and all comments up to the current interaction.
 */
export async function saveThreadAsSeed(
  postContent: string,
  comments: Comment[],
  botReply: string,
  replyAuthor: string
): Promise<string[] | null> {
  try {
    const commentLines = comments.map((c) => {
      const name = typeof c.author === 'string' ? c.author : c.author.name;
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

    return await sendSeed(fullText, title);
  } catch (error) {
    console.error('Error saving thread as seed:', error);
    return null;
  }
}

/**
 * Store arbitrary text as a Neutron seed.
 * Used for generic memory creation from the dashboard.
 */
export async function saveTextAsSeed(
  text: string,
  title: string
): Promise<string[] | null> {
  try {
    return await sendSeed(text, title);
  } catch (error) {
    console.error('Error saving text seed:', error);
    return null;
  }
}

/**
 * Query seeds using semantic search.
 */
export async function querySeeds(
  query: string,
  limit: number = 10,
  threshold: number = 0.5
) {
  const url = `${config.neutron.baseUrl}/seeds/query?appId=${config.neutron.appId}&externalUserId=neutron-memory-bot`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.neutron.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, limit, threshold })
  });

  if (!res.ok) {
    throw new Error(`Seed query failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Internal: send text content to the Neutron seeds API via multipart/form-data.
 */
async function sendSeed(text: string, title: string): Promise<string[] | null> {
  const url = `${config.neutron.baseUrl}/seeds?appId=${config.neutron.appId}&externalUserId=neutron-memory-bot`;

  const formData = new FormData();
  formData.append('text', JSON.stringify([text]));
  formData.append('textTypes', JSON.stringify(['text']));
  formData.append('textSources', JSON.stringify(['mcp']));
  formData.append('textTitles', JSON.stringify([title]));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.neutron.apiKey}`
      // Do NOT set Content-Type — fetch sets it automatically with boundary for FormData
    },
    body: formData
  });

  if (res.status === 201) {
    const data = await res.json();
    console.log('Seed saved, jobIds:', data.jobIds);
    return data.jobIds;
  } else {
    console.error('Seed save failed:', res.status, await res.text());
    return null;
  }
}

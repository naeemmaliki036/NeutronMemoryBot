import { execFile } from 'child_process';
import { resolve } from 'path';

const SCRIPT_PATH = process.env.NEUTRON_CLI_PATH || resolve(
  process.cwd(), '..', 'skills', 'vanar-neutron-memory', 'scripts', 'neutron-memory.sh'
);

interface ExecResult {
  stdout: string;
  stderr: string;
}

function execCli(args: string[]): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(SCRIPT_PATH, args, {
      env: { ...process.env },
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`neutron-memory CLI failed: ${error.message}\nstderr: ${stderr}`));
        return;
      }
      resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

function parseJson<T = unknown>(stdout: string): T {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('Empty response from neutron-memory CLI');
  return JSON.parse(trimmed) as T;
}

/** Save text to memory */
export async function saveSeed(text: string, title: string = 'Untitled'): Promise<unknown> {
  const { stdout } = await execCli(['save', text, title]);
  return parseJson(stdout);
}

/** Semantic search over memories */
export async function searchSeeds(
  query: string,
  limit: number = 10,
  threshold: number = 0.5
): Promise<{ results: Array<{ content: string; similarity: number; seedId: string }> }> {
  const { stdout } = await execCli(['search', query, String(limit), String(threshold)]);
  return parseJson(stdout);
}

// --- Convenience: Thread snapshot ---

interface Comment {
  author: { name: string } | string;
  content: string;
}

/** Format a thread (post + comments + bot reply) and save to memory */
export async function saveThreadAsSeed(
  postContent: string,
  comments: Comment[],
  botReply: string,
  replyAuthor: string
): Promise<unknown | null> {
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
      `NeutronMemoryBot: ${botReply}`,
    ].join('\n');

    const title = `Thread with ${replyAuthor} - ${new Date().toISOString().split('T')[0]}`;
    return await saveSeed(fullText, title);
  } catch (error) {
    console.error('Error saving thread as seed:', error);
    return null;
  }
}

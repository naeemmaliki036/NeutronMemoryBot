import { execFile } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = process.env.NEUTRON_CLI_PATH || resolve(
  __dirname, '..', 'skills', 'vanar-neutron-memory', 'scripts', 'neutron-memory.sh'
);

function execCli(args) {
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

function parseJson(stdout) {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('Empty CLI response');
  return JSON.parse(trimmed);
}

export async function saveSeed(text, title = 'Untitled') {
  const { stdout } = await execCli(['save', text, title]);
  return parseJson(stdout);
}

export async function searchSeeds(query, limit = 10, threshold = 0.5) {
  const { stdout } = await execCli(['search', query, String(limit), String(threshold)]);
  return parseJson(stdout);
}

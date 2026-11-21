// Shared helpers for n-stack hooks and CLIs. Node built-ins only, so it runs
// anywhere Claude Code runs (Windows Git Bash, macOS, Linux, CI).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

export const IS_WIN = process.platform === 'win32';

/** Read the hook's JSON payload from stdin. Returns {} when stdin is empty or not JSON. */
export async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8').trim();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

/** Run a program without a shell. Never throws; returns {code, stdout, stderr}. */
export function exec(cmd, args, { cwd, timeoutMs = 30_000, input } = {}) {
  const r = spawnSync(cmd, args, {
    cwd, input, encoding: 'utf8', timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024,
  });
  return {
    code: r.error ? (r.error.code === 'ETIMEDOUT' ? 124 : 127) : (r.status ?? 1),
    stdout: r.stdout || '',
    stderr: r.stderr || (r.error ? String(r.error.message) : ''),
    timedOut: r.error?.code === 'ETIMEDOUT',
  };
}

/** Run a user-configured command line through the platform shell (cmd.exe on Windows, sh elsewhere). */
export function shell(commandLine, { cwd, timeoutMs = 600_000 } = {}) {
  const r = spawnSync(commandLine, {
    cwd, shell: true, encoding: 'utf8', timeout: timeoutMs, windowsHide: true, maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  if (r.error?.code === 'ETIMEDOUT') return { code: 124, output: `${out}\n[n-stack] timed out after ${timeoutMs / 1000}s` };
  return { code: r.status ?? 1, output: out };
}

export function git(args, cwd, timeoutMs) {
  return exec('git', args, { cwd, timeoutMs });
}

/** Project root: the git top level of `cwd`, falling back to CLAUDE_PROJECT_DIR or cwd. */
export function projectRoot(cwd) {
  const start = cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const r = git(['rev-parse', '--show-toplevel'], start, 5_000);
  return path.resolve(r.code === 0 ? r.stdout.trim() : start);
}

/**
 * Fast project detection for hooks (they run on every tool call): walk up from `start`
 * looking for .n-stack/config.json. Pure filesystem, no git process. null = not an
 * n-stack project, so the hook does nothing.
 */
export function findConfigRoot(start) {
  let dir = path.resolve(start || process.env.CLAUDE_PROJECT_DIR || process.cwd());
  for (;;) {
    if (fs.existsSync(path.join(dir, '.n-stack', 'config.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The main checkout for a linked worktree (where .n-stack/tmp holds the frozen-test list,
 * the override file and verify state); `root` itself otherwise. Reads the `.git` file a
 * worktree has instead of spawning git.
 */
export function mainRoot(root) {
  try {
    const dotGit = path.join(root, '.git');
    if (!fs.statSync(dotGit).isFile()) return root;
    const m = fs.readFileSync(dotGit, 'utf8').match(/gitdir:\s*(.+)/);
    if (!m) return root;
    const gitdir = path.resolve(root, m[1].trim()).replace(/\\/g, '/');
    const i = gitdir.lastIndexOf('/.git/worktrees/');
    return i >= 0 ? path.resolve(gitdir.slice(0, i)) : root;
  } catch { return root; }
}

/** Hash of the working tree relative to HEAD (tracked diff + untracked files' size/mtime). */
export function fingerprint(root) {
  const head = git(['rev-parse', 'HEAD'], root).stdout.trim();
  const status = git(['status', '--porcelain=v1', '-uall'], root).stdout;
  if (!status.trim()) return { fp: `clean:${head}`, changed: [], head };
  const lines = status.split('\n').filter(Boolean);
  const changed = lines.map((l) => l.slice(3).replace(/^"|"$/g, '').split(' -> ').pop());
  const untracked = lines.filter((l) => l.startsWith('??')).map((l) => l.slice(3).replace(/^"|"$/g, ''))
    .map((f) => { try { const s = fs.statSync(path.join(root, f)); return `${f}:${s.size}:${s.mtimeMs}`; } catch { return f; } });
  const diff = git(['diff', 'HEAD', '--no-color'], root, 60_000).stdout;
  return { fp: sha1(`${head}\n${diff}\n${untracked.join('\n')}`), changed, head };
}

/** The project's n-stack config, or null when this is not an n-stack project (hooks then do nothing). */
export function loadConfig(root) {
  const file = path.join(root, '.n-stack', 'config.json');
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return { _error: `could not parse ${file}: ${e.message}` }; }
}

export function tmpDir(root) {
  const dir = path.join(root, '.n-stack', 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function readState(root) {
  try { return JSON.parse(fs.readFileSync(path.join(tmpDir(root), 'state.json'), 'utf8')); }
  catch { return {}; }
}

/** Atomic write (temp file + rename) so parallel agents' hooks never leave half-written JSON. */
export function writeState(root, state) {
  if (state.stopBlocks) {
    const keys = Object.keys(state.stopBlocks);
    for (const k of keys.slice(0, Math.max(0, keys.length - 20))) delete state.stopBlocks[k];
  }
  const file = path.join(tmpDir(root), 'state.json');
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  try { fs.renameSync(tmp, file); } catch { fs.rmSync(tmp, { force: true }); }
}

/** Forward-slash path relative to root, or null if outside root. */
export function relToRoot(root, file) {
  if (!file) return null;
  const abs = path.resolve(root, file);
  const rel = path.relative(root, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

export function sha1(text) {
  return crypto.createHash('sha1').update(text).digest('hex');
}

export function firstLines(text, n = 40) {
  const lines = String(text).split(/\r?\n/);
  const head = lines.slice(0, n).join('\n');
  return lines.length > n ? `${head}\n… (${lines.length - n} more lines)` : head;
}

// ---------- evidence log (feeds /n-retro) ----------

export function eventsFile() {
  const dir = path.join(os.homedir(), '.n-stack');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'events.jsonl');
}

/** Append one event. Never throws: evidence logging must not break a hook. */
export function logEvent(root, event) {
  try {
    const record = { ts: new Date().toISOString(), project: root ? path.basename(root) : null, ...event };
    fs.appendFileSync(eventsFile(), `${JSON.stringify(record)}\n`);
  } catch { /* ignore */ }
}

// ---------- file classification ----------

const TEST_PATH_RE = [
  /(^|\/)(__tests__|tests?|spec|e2e)\//i,
  /\.(test|spec)\.[cm]?[jt]sx?$/i,
  /(^|\/)test_[^/]+\.py$/i,
  /_test\.(py|go)$/i,
  /(Test|Tests|Spec)\.(java|kt|cs|swift)$/,
];
export function isTestFile(rel) {
  return TEST_PATH_RE.some((re) => re.test(rel));
}

const SECRET_OK_RE = /\.env\.(example|sample|template|defaults)$/i;
export function isSecretPath(rel) {
  const p = rel.replace(/\\/g, '/');
  const base = p.split('/').pop();
  if (/^\.env(\..+)?$/i.test(base) && !SECRET_OK_RE.test(base)) return true;
  if (/\.(pem|key|p12|pfx|keystore|jks)$/i.test(base)) return true;
  if (/^id_(rsa|dsa|ecdsa|ed25519)$/i.test(base)) return true;
  if (/(^|\/)\.aws\/credentials$/.test(p)) return true;
  return false;
}

export const SOURCE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go', '.rs', '.java', '.kt', '.cs', '.rb', '.php', '.swift', '.vue', '.svelte',
]);

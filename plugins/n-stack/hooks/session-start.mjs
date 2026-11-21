// SessionStart: give every new session the project's current state in a few lines,
// so no tokens are spent rediscovering it. Also refreshes the code map when stale.
// Prints nothing outside n-stack projects.
import { readStdinJson, findConfigRoot, loadConfig, git, readState, logEvent, exec } from '../lib/common.mjs';
import { isStale, generate } from '../lib/codemap.mjs';
import { checkDocs } from '../lib/docs.mjs';

const payload = await readStdinJson();
const root = findConfigRoot(payload.cwd);
if (!root) process.exit(0);
const config = loadConfig(root);
if (!config) process.exit(0);

const lines = [];
if (config._error) lines.push(`n-stack: ${config._error}`);

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], root).stdout.trim() || '(no commits)';
const dirty = git(['status', '--porcelain'], root).stdout.split('\n').filter(Boolean).length;
const last = readState(root).lastVerify;
const verify = last ? `${last.status} (${last.at?.slice(0, 16).replace('T', ' ')})` : 'not run yet';
lines.push(`n-stack project · branch ${branch} · ${dirty} uncommitted file(s) · last verify: ${verify}`);

try {
  if (isStale(root)) generate(root);
  lines.push('Code map: .n-stack/tmp/codemap.md — read it before searching the codebase.');
} catch (e) {
  lines.push(`Code map: could not generate (${e.message})`);
}

try {
  const stale = checkDocs(root).filter((d) => d.status !== 'ok');
  if (stale.length) lines.push(`Docs needing sync (${stale.length}): ${stale.map((d) => d.doc).slice(0, 5).join(', ')} → /n-docs`);
} catch { /* not a git repo yet */ }

if ((config.tasks || 'github') === 'github') {
  const r = exec('gh', ['issue', 'list', '--label', 'n-task', '--label', 'status:doing', '--state', 'open',
    '--json', 'number,title', '--limit', '10'], { cwd: root, timeoutMs: 8_000 });
  if (r.code === 0) {
    try {
      const doing = JSON.parse(r.stdout);
      if (doing.length) lines.push(`In progress: ${doing.map((i) => `#${i.number} ${i.title}`).join(' · ')}`);
    } catch { /* ignore */ }
  }
}

logEvent(root, { type: 'session_start', source: payload.source || 'startup' });
process.stdout.write(`${lines.join('\n')}\n`);

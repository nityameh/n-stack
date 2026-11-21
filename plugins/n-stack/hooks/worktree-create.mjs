// WorktreeCreate: replaces Claude Code's default worktree creation so a parallel
// implementer starts from the CURRENT commit of your feature branch (the default
// starts from the default branch and would miss earlier tasks' commits).
//
// - Worktrees live OUTSIDE the repo (../.<repo>-worktrees/<name>) so test runners and
//   linters scanning the repo never pick them up.
// - node_modules is linked (a junction on Windows, no admin needed) instead of
//   reinstalled: no extra install time, no extra tokens.
// - Only committed work is visible in the worktree; /n-build commits before dispatching.
// stdout must contain only the worktree path.
import fs from 'node:fs';
import path from 'node:path';
import { readStdinJson, projectRoot, loadConfig, git, logEvent } from '../lib/common.mjs';

const payload = await readStdinJson();
const root = projectRoot(payload.cwd);
const name = String(payload.name || `wt-${Date.now()}`).replace(/[^\w.-]/g, '-');

let base = 'HEAD';
if (!loadConfig(root)) {
  // Not an n-stack project: keep Claude Code's default of basing on the default branch.
  const ref = git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], root).stdout.trim();
  if (ref) base = ref;
}

const dir = path.join(path.dirname(root), `.${path.basename(root)}-worktrees`, name);
fs.mkdirSync(path.dirname(dir), { recursive: true });
const branch = `wt/${name}`;

let r = git(['worktree', 'add', '-b', branch, dir, base], root, 120_000);
if (r.code !== 0 && /already exists/.test(r.stderr)) r = git(['worktree', 'add', dir, branch], root, 120_000);
if (r.code !== 0) {
  process.stderr.write(`n-stack worktree-create failed: ${r.stderr}\n`);
  process.exit(1);
}

for (const shared of ['node_modules', '.venv']) {
  const src = path.join(root, shared);
  const dst = path.join(dir, shared);
  if (fs.existsSync(src) && !fs.existsSync(dst)) {
    try { fs.symlinkSync(src, dst, process.platform === 'win32' ? 'junction' : 'dir'); } catch { /* agent can install */ }
  }
}

logEvent(root, { type: 'worktree_create', name, base });
process.stdout.write(dir);

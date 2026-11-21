#!/usr/bin/env node
// managed by n-stack — do not edit; refresh with `nstack-project update`
//
// Ship gate. A script, not prose: /n-ship runs it locally and CI runs it on every PR,
// so "reviewed, tested, secrets-clean, docs current" is checked by code that cannot be
// talked out of it. Make the CI job a required check (branch protection) to enforce it
// server-side.
//
// Usage: node .n-stack/bin/gate.mjs ship [--base <ref>] [--skip-verify] [--skip-secrets]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { checkDocs } from './docs.mjs';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };

function run(cmd, cmdArgs, cwd) {
  const r = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.error ? 127 : (r.status ?? 1), out: `${r.stdout || ''}${r.stderr || ''}` };
}
const git = (a, cwd) => run('git', a, cwd);

const root = git(['rev-parse', '--show-toplevel'], process.cwd()).out.trim();
let config = {};
try { config = JSON.parse(fs.readFileSync(path.join(root, '.n-stack', 'config.json'), 'utf8')); } catch { /* defaults */ }

const branch = process.env.GITHUB_HEAD_REF || git(['rev-parse', '--abbrev-ref', 'HEAD'], root).out.trim();
const slug = branch.replace(/[^\w.-]+/g, '-');
const head = git(['rev-parse', 'HEAD'], root).out.trim();
const defaultBranch = (git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], root).out.trim() || 'origin/main');
const base = opt('--base') || defaultBranch;

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

// 1. Feature branch
check('feature branch', !['main', 'master', defaultBranch.replace(/^origin\//, '')].includes(branch), `on ${branch}`);

// 2. Review record
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function newest(dir) {
  const re = new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${escapeRe(slug)}\\.md$`); // exact branch, not a suffix match
  try { return fs.readdirSync(path.join(root, dir)).filter((f) => re.test(f)).sort().pop() || null; }
  catch { return null; }
}
const isDocPath = (f) => /^docs\//.test(f) || /\.mdx?$/.test(f) || /^\.n-stack\//.test(f) || /^CHANGELOG/.test(f);
const isDocCommit = (c) => git(['diff-tree', '--no-commit-id', '--name-only', '-r', c], root).out.split('\n').filter(Boolean).every(isDocPath);
const subjectOf = (c) => git(['log', '-1', '--format=%s', c], root).out.trim();

/** commit sha → patch-id (stable across rebases when the change itself is unchanged). */
function patchIds(range) {
  const log = git(['log', '-p', '--no-merges', '--no-color', '--no-ext-diff', '--format=commit %H', range], root).out;
  if (!log.trim()) return new Map();
  const r = spawnSync('git', ['patch-id', '--stable'], { cwd: root, input: log, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return new Map((r.stdout || '').split('\n').filter(Boolean).map((l) => { const [pid, sha] = l.split(' '); return [sha, pid]; }));
}

const migrationRe = new RegExp(config.migrationPaths || '(^|/)(migrations?|alembic/versions|db/migrate|prisma/migrations)/|\\.sql$');
const changedFiles = git(['diff', '--name-only', `${base}...HEAD`], root).out.split('\n').filter(Boolean);
const hasMigrations = changedFiles.some((f) => migrationRe.test(f));
const docsOnly = changedFiles.length > 0 && changedFiles.every(isDocPath);
const reviewFile = newest('docs/reviews');

if (docsOnly) {
  check('review record', true, 'docs-only change: review not required');
} else if (!reviewFile) {
  check('review record', false, `no docs/reviews/<date>-${slug}.md — run /n-review`);
} else {
  const text = fs.readFileSync(path.join(root, 'docs/reviews', reviewFile), 'utf8');
  const reviewed = (text.match(/Head reviewed:\s*`?([0-9a-f]{7,40})/i) || [])[1];
  const gatePass = /\*\*PASS\*\*/.test(text);
  const openBlocking = text.split('\n').filter((l) => /^\|\s*\d+\s*\|\s*P[01]\s*\|/.test(l) && /\|\s*open\b/i.test(l)).length;
  let covers = false;
  let coverDetail = 'no "Head reviewed: <sha>" line';
  if (reviewed && git(['cat-file', '-e', `${reviewed}^{commit}`], root).code !== 0) {
    coverDetail = `reviewed commit ${reviewed} not found (fetch full history)`;
  } else if (reviewed) {
    // Coverage by content, not by commit hash: every code commit on the branch must match a
    // reviewed commit's patch-id (so rebasing doesn't void the review), be a fix(review)
    // commit, or touch docs only.
    const reviewedBase = git(['merge-base', reviewed, base], root).out.trim();
    const reviewedPids = new Set(patchIds(`${reviewedBase}..${reviewed}`).values());
    const current = patchIds(`${git(['merge-base', 'HEAD', base], root).out.trim()}..HEAD`);
    const offending = [...current.entries()].filter(([sha, pid]) => !reviewedPids.has(pid)
      && !/^fix\(review\)/.test(subjectOf(sha)) && !isDocCommit(sha));
    covers = offending.length === 0;
    coverDetail = covers ? `covers every code commit (reviewed at ${reviewed})`
      : `${offending.length} code commit(s) not covered by the review (${offending.slice(0, 3).map(([s]) => s.slice(0, 7)).join(', ')}) — re-run /n-review`;
  }
  check('review record', gatePass && openBlocking === 0 && covers,
    `${reviewFile}: gate ${gatePass ? 'PASS' : 'not PASS'}, ${openBlocking} open P0/P1, ${coverDetail}`);
  if (hasMigrations) {
    check('migration safety', /Migration safety:\s*PASS/i.test(text), 'branch changes migrations; review must record "Migration safety: PASS"');
  }
}

// 3. QA record
if (config.requireQa !== false && !docsOnly) {
  const qa = newest('docs/qa');
  check('qa record', Boolean(qa), qa ? `docs/qa/${qa}` : `no docs/qa/<date>-${slug}.md — run /n-test (or set "requireQa": false)`);
}

// 4. Docs drift
try {
  const stale = checkDocs(root).filter((d) => d.status !== 'ok');
  check('docs current', stale.length === 0, stale.length ? `${stale.map((d) => `${d.doc} (${d.status})`).join(', ')} — run /n-docs` : 'all marked docs verified');
} catch (e) { check('docs current', false, e.message); }

// 5. Secrets
if (!flag('--skip-secrets')) {
  const hasNew = run('gitleaks', ['git', '--help'], root).code === 0;
  const probe = run('gitleaks', ['version'], root);
  if (probe.code === 127) {
    check('secrets scan', false, 'gitleaks not installed (winget install gitleaks / brew install gitleaks)');
  } else {
    const r = hasNew
      ? run('gitleaks', ['git', `--log-opts=${base}..HEAD`, '--redact', '--no-banner'], root)
      : run('gitleaks', ['detect', `--log-opts=${base}..HEAD`, '--redact', '--no-banner'], root);
    check('secrets scan', r.code === 0, r.code === 0 ? `no leaks in ${base}..HEAD` : r.out.trim().split('\n').slice(-5).join(' | '));
  }
}

// 6. Verify
if (!flag('--skip-verify') && config.verify) {
  const r = spawnSync(config.verify, { cwd: root, shell: true, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
  check('verify', r.status === 0, r.status === 0 ? config.verify : `${config.verify} failed`);
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(17)} ${r.detail}`);
}
console.log(failed ? `\nGATE: BLOCKED (${failed} failing)` : `\nGATE: PASS at ${head.slice(0, 7)}`);
process.exit(failed ? 1 : 0);

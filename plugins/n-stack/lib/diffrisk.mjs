// Decide which files of a diff a reviewer must actually OPEN, so a per-task check costs a
// stat table and a handful of reads instead of every changed file (token budget).
// Pure classification (classify) is separated from git plumbing (diffRisk) so it is testable.
import fs from 'node:fs';
import path from 'node:path';
import { git, loadConfig } from './common.mjs';

const DEFAULT_MIGRATIONS = '(^|/)(migrations?|alembic/versions|db/migrate|prisma/migrations)/|\\.sql$';
const RISKY_PATH = /(auth|login|logout|session|token|password|passwd|payment|billing|stripe|checkout|crypto|secret|permission|rbac|acl|webhook|upload)/i;
const MANIFEST = /(^|\/)(package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|requirements[^/]*\.txt|pyproject\.toml|poetry\.lock|go\.mod|go\.sum|Cargo\.toml|Cargo\.lock|Gemfile(\.lock)?)$/;
const INFRA = /(^|\/)(\.github\/|\.n-stack\/|\.githooks\/|Dockerfile|docker-compose[^/]*\.ya?ml)/;
const TEST_FILE = /(\.(test|spec)\.[a-z]+$|(^|\/)(tests?|__tests__)\/|(^|\/)test_[^/]+\.py$|_test\.(go|py)$)/;

export const DEFAULT_MAX_LINES = 150;

const normalize = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');
const inScope = (file, scope) => scope.some((s) => {
  const x = normalize(s).replace(/\/$/, '');
  return file === x || file.startsWith(`${x}/`);
});

/**
 * @param {{file:string, added:number, deleted:number, status?:string}[]} changes
 * @param {{scope?:string[], migrationPaths?:string, maxLines?:number}} opts
 * @returns {{open:{file:string, added:number, deleted:number, reasons:string[]}[], skim:string[]}}
 */
export function classify(changes, { scope = [], migrationPaths, maxLines = DEFAULT_MAX_LINES } = {}) {
  let migrationRe;
  try { migrationRe = new RegExp(migrationPaths || DEFAULT_MIGRATIONS); } catch { migrationRe = new RegExp(DEFAULT_MIGRATIONS); }
  const open = [];
  const skim = [];
  for (const c of changes) {
    const file = normalize(c.file);
    const reasons = [];
    if (scope.length && !inScope(file, scope)) reasons.push('outside-scope');
    if (RISKY_PATH.test(file)) reasons.push('risky-path');
    if (migrationRe.test(file)) reasons.push('migration');
    if (MANIFEST.test(file)) reasons.push('dependencies');
    if (INFRA.test(file)) reasons.push('infra');
    if (c.added + c.deleted > maxLines) reasons.push('large');
    if (TEST_FILE.test(file) && (c.status === 'D' || c.deleted > c.added)) reasons.push('tests-shrunk');
    if (reasons.length) open.push({ file, added: c.added, deleted: c.deleted, reasons });
    else skim.push(file);
  }
  return { open, skim };
}

function countLines(root, rel) {
  try {
    const text = fs.readFileSync(path.join(root, rel), 'utf8');
    return text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  } catch { return 0; }
}

/** Changes of the working tree vs `base` (default HEAD), untracked files included. */
export function collectChanges(root, base = 'HEAD') {
  const changes = new Map();
  const num = git(['diff', '--numstat', '--no-renames', base], root);
  const status = git(['diff', '--name-status', '--no-renames', base], root);
  if (num.code !== 0) throw new Error(num.stderr.trim() || `git diff ${base} failed`);
  const stat = new Map(status.stdout.split('\n').filter(Boolean).map((l) => { const [s, ...f] = l.split('\t'); return [f.join('\t'), s]; }));
  for (const line of num.stdout.split('\n').filter(Boolean)) {
    const [a, d, ...f] = line.split('\t');
    const file = f.join('\t');
    // binary files report "-": treat as one big change so they get opened
    changes.set(file, { file, added: a === '-' ? 9999 : Number(a), deleted: d === '-' ? 0 : Number(d), status: stat.get(file) });
  }
  const untracked = git(['ls-files', '--others', '--exclude-standard'], root).stdout.split('\n').filter(Boolean);
  for (const file of untracked) changes.set(file, { file, added: countLines(root, file), deleted: 0, status: 'A' });
  return [...changes.values()];
}

export function diffRisk(root, { base = 'HEAD', scope = [], maxLines } = {}) {
  const config = loadConfig(root) || {};
  const changes = collectChanges(root, base);
  const { open, skim } = classify(changes, { scope, migrationPaths: config.migrationPaths, maxLines });
  const added = changes.reduce((s, c) => s + (c.added === 9999 ? 0 : c.added), 0);
  const deleted = changes.reduce((s, c) => s + c.deleted, 0);
  return { files: changes.length, added, deleted, open, skim };
}

export function formatRisk(r) {
  if (!r.files) return 'DIFF: no changes.';
  const out = [`DIFF: ${r.files} file(s), +${r.added} -${r.deleted}`];
  out.push(r.open.length ? `OPEN these (${r.open.length}):` : 'OPEN these: none');
  for (const o of r.open) out.push(`  ${o.file}  +${o.added} -${o.deleted}  [${o.reasons.join(', ')}]`);
  if (r.skim.length) out.push(`SKIM-OK (${r.skim.length}): ${r.skim.join(', ')} — covered by verify; read only if verify is red or the report disagrees.`);
  return out.join('\n');
}

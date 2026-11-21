#!/usr/bin/env node
// managed by n-stack — do not edit; refresh with `nstack-project update`
//
// Docs drift detection. A doc declares which code it describes and the commit at which
// it was last checked against that code:
//
//   <!-- nstack-doc covers="src/billing/**, src/db/schema.ts" verified="a1b2c3d" -->
//
// A doc is STALE when any covered path changed after `verified` (committed or not),
// UNVERIFIED when it has `covers` but no valid `verified`. Git history is the doc's
// version history: `git log -p <doc>`, `git show <tag>:<doc>`, `git restore -s <sha> <doc>`.
//
// Usage: node .n-stack/bin/docs.mjs check | stamp <doc> [sha]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER_RE = /<!--\s*nstack-doc\s+([^>]*?)-->/;
const ATTR_RE = /(\w+)="([^"]*)"/g;

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function parseMarker(text) {
  const m = text.match(MARKER_RE);
  if (!m) return null;
  const attrs = {};
  let a;
  ATTR_RE.lastIndex = 0;
  while ((a = ATTR_RE.exec(m[1]))) attrs[a[1]] = a[2];
  return attrs;
}

export function checkDocs(root) {
  const ls = git(['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.md'], root);
  if (ls.code !== 0) throw new Error('not a git repository');
  const results = [];
  for (const doc of ls.stdout.split('\n').map((s) => s.trim()).filter(Boolean)) {
    if (doc.includes('node_modules/')) continue;
    let text;
    try { text = fs.readFileSync(path.join(root, doc), 'utf8'); } catch { continue; }
    const attrs = parseMarker(text);
    if (!attrs?.covers) continue;
    const covers = attrs.covers.split(',').map((s) => s.trim()).filter(Boolean);
    const specs = covers.map((c) => `:(glob)${c}`);
    const verified = (attrs.verified || '').trim();
    if (!verified || git(['cat-file', '-e', `${verified}^{commit}`], root).code !== 0) {
      results.push({ doc, covers, verified: verified || null, status: 'unverified', changed: [] });
      continue;
    }
    const committed = git(['diff', '--name-only', `${verified}`, 'HEAD', '--', ...specs], root).stdout;
    const working = git(['diff', '--name-only', 'HEAD', '--', ...specs], root).stdout;
    const changed = [...new Set(`${committed}\n${working}`.split('\n').map((s) => s.trim()).filter((f) => f && f !== doc))];
    results.push({ doc, covers, verified, status: changed.length ? 'stale' : 'ok', changed });
  }
  return results;
}

export function stampDoc(root, doc, sha) {
  const file = path.join(root, doc);
  const text = fs.readFileSync(file, 'utf8');
  const ref = sha || git(['rev-parse', '--short', 'HEAD'], root).stdout.trim();
  const m = text.match(MARKER_RE);
  if (!m) throw new Error(`${doc} has no nstack-doc marker`);
  const inner = /verified="[^"]*"/.test(m[1]) ? m[1].replace(/verified="[^"]*"/, `verified="${ref}"`) : `${m[1].trim()} verified="${ref}" `;
  fs.writeFileSync(file, text.replace(MARKER_RE, `<!-- nstack-doc ${inner.trim()} -->`));
  return ref;
}

function main(argv) {
  const root = git(['rev-parse', '--show-toplevel'], process.cwd()).stdout.trim() || process.cwd();
  const [cmd, ...rest] = argv;
  if (cmd === 'stamp') {
    if (!rest[0]) { console.error('usage: docs.mjs stamp <doc> [sha]'); process.exit(2); }
    console.log(`stamped ${rest[0]} verified=${stampDoc(root, rest[0], rest[1])}`);
    return;
  }
  const results = checkDocs(root);
  if (!results.length) { console.log('No docs carry an nstack-doc marker.'); return; }
  let bad = 0;
  for (const r of results) {
    if (r.status === 'ok') { console.log(`ok          ${r.doc}`); continue; }
    bad++;
    console.log(`${r.status.padEnd(11)} ${r.doc}${r.changed.length ? `  ← ${r.changed.slice(0, 8).join(', ')}${r.changed.length > 8 ? ' …' : ''}` : ''}`);
  }
  process.exit(bad ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));

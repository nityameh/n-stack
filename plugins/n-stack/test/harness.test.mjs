// Regression tests for n-stack's deterministic parts: hooks, ship gate, docs drift, code map.
// Run: node --test plugins/n-stack/test/   (from the n-stack repo root)
// Each test builds a throwaway git repo in the OS temp dir.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = (name) => path.join(PLUGIN, 'hooks', name);
const KIT_BIN = path.join(PLUGIN, 'project-kit', 'n-stack', 'bin');
const ENV = { ...process.env, NSTACK_ALLOW_NO_GITLEAKS: '1', HOME: os.tmpdir(), USERPROFILE: os.tmpdir() };

function sh(cmd, args, cwd, input) {
  const r = spawnSync(cmd, args, { cwd, input, encoding: 'utf8', env: ENV });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
const git = (cwd, ...args) => sh('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'user.email=t@t', '-c', 'user.name=t', ...args], cwd);
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
const hook = (name, payload) => sh(process.execPath, [HOOK(name)], payload.cwd, JSON.stringify(payload));
const gate = (root, ...args) => sh(process.execPath, [path.join(root, '.n-stack/bin/gate.mjs'), 'ship', '--skip-secrets', ...args], root);

const created = [];
after(() => {
  for (const dir of created) fs.rmSync(dir, { recursive: true, force: true });
});

function makeRepo(config = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nstack-test-'));
  created.push(root);
  git(root, 'init', '-q', '-b', 'main');
  write(root, '.n-stack/config.json', JSON.stringify({ verify: 'node verify.js', requireQa: true, ...config }));
  fs.mkdirSync(path.join(root, '.n-stack/bin'), { recursive: true });
  for (const f of ['gate.mjs', 'docs.mjs']) fs.copyFileSync(path.join(KIT_BIN, f), path.join(root, '.n-stack/bin', f));
  // verify.js counts its runs and fails while a file named BROKEN exists
  write(root, 'verify.js', "const fs=require('fs');fs.appendFileSync('.n-stack/tmp/runs','x');process.exit(fs.existsSync('BROKEN')?1:0)");
  write(root, '.gitignore', '.n-stack/tmp/\n');
  fs.mkdirSync(path.join(root, '.n-stack/tmp'), { recursive: true });
  write(root, 'src/money.ts', 'export function round(n: number) { return n; }\n');
  write(root, 'src/money.test.ts', "test('a', () => { expect(1).toBe(1); expect(2).toBe(2); });\n");
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'init');
  return root;
}
const runs = (root) => { try { return fs.readFileSync(path.join(root, '.n-stack/tmp/runs'), 'utf8').length; } catch { return 0; } };

test('guard blocks secrets, weakening, and enforces agent roles', () => {
  const root = makeRepo();
  const p = (tool, input, extra = {}) => hook('guard.mjs', { cwd: root, tool_name: tool, tool_input: input, ...extra }).code;
  const f = (rel) => path.join(root, rel);
  assert.equal(p('Read', { file_path: f('.env') }), 2);
  assert.equal(p('Read', { file_path: f('.env.example') }), 0);
  assert.equal(p('Grep', { pattern: 'KEY', path: f('.env.local') }), 2);
  assert.equal(p('Bash', { command: 'cat .env' }), 2);
  assert.equal(p('Bash', { command: "node -e 'process.env.X'" }), 0);
  assert.equal(p('Bash', { command: 'rm src/money.test.ts' }), 2);
  assert.equal(p('Bash', { command: 'rm src/money.ts' }), 0);
  assert.equal(p('Bash', { command: 'touch .n-stack/allow-weaken' }), 2);
  assert.equal(p('Edit', { file_path: f('src/money.test.ts'), old_string: "test('a'", new_string: "test.skip('a'" }), 2);
  assert.equal(p('Write', { file_path: f('src/money.test.ts'), content: "test('a', () => {});" }), 2);
  assert.equal(p('Edit', { file_path: f('src/money.ts'), old_string: 'export', new_string: '// @ts-ignore\nexport' }), 2);
  assert.equal(p('Edit', { file_path: f('src/money.ts'), old_string: 'n;', new_string: 'Math.round(n);' }), 0);
  assert.equal(p('Edit', { file_path: f('src/money.ts'), old_string: 'a', new_string: 'b' }, { agent_type: 'n-stack:n-scout' }), 2);
  assert.equal(p('Write', { file_path: f('src/x.ts'), content: '' }, { agent_type: 'n-stack:n-qa-tester' }), 2);
  assert.equal(p('Write', { file_path: f('.n-stack/tmp/qa/x.js'), content: '' }, { agent_type: 'n-stack:n-qa-tester' }), 0);
  assert.equal(p('Write', { file_path: f('src/y.ts'), content: '' }, { agent_type: 'n-stack:n-test-writer' }), 2);
  assert.equal(p('Write', { file_path: f('src/y.test.ts'), content: 'expect(1)' }, { agent_type: 'n-stack:n-test-writer' }), 0);
  // human override
  write(root, '.n-stack/allow-weaken', '');
  assert.equal(p('Edit', { file_path: f('src/money.test.ts'), old_string: "test('a'", new_string: "test.skip('a'" }), 0);
});

test('guard is inert outside n-stack projects', () => {
  const plain = fs.mkdtempSync(path.join(os.tmpdir(), 'plain-'));
  created.push(plain);
  assert.equal(hook('guard.mjs', { cwd: plain, tool_name: 'Read', tool_input: { file_path: path.join(plain, '.env') } }).code, 0);
});

test('frozen tests stay frozen inside a linked worktree', () => {
  const root = makeRepo();
  write(root, '.n-stack/tmp/protected-tests.json', JSON.stringify(['src/money.test.ts']));
  const wt = path.join(os.tmpdir(), `nstack-wt-${Date.now()}`);
  created.push(wt);
  git(root, 'worktree', 'add', '-q', '-b', 'wt/t', wt, 'HEAD');
  const r = hook('guard.mjs', {
    cwd: wt, agent_type: 'n-stack:n-implementer', tool_name: 'Edit',
    tool_input: { file_path: path.join(wt, 'src/money.test.ts'), old_string: 'a', new_string: 'b' },
  });
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /frozen/);
});

test('stop gate: only judges this turn, caches results, bounded blocking', () => {
  const root = makeRepo();
  write(root, 'BROKEN', '');
  // user's own red WIP existed before the turn: no block
  hook('log-activity.mjs', { cwd: root, hook_event_name: 'UserPromptSubmit', prompt: 'explain this' });
  assert.equal(hook('stop-verify.mjs', { cwd: root }).code, 0);
  assert.equal(runs(root), 0);
  // Claude changes code during the turn while red: blocked, verify runs once
  write(root, 'src/money.ts', 'export const x = 1;\n');
  assert.equal(hook('stop-verify.mjs', { cwd: root }).code, 2);
  assert.equal(runs(root), 1);
  // same code again: blocked from cache, verify NOT re-run
  assert.equal(hook('stop-verify.mjs', { cwd: root, stop_hook_active: true }).code, 2);
  assert.equal(runs(root), 1);
  // third time: allowed with a warning
  const third = hook('stop-verify.mjs', { cwd: root, stop_hook_active: true });
  assert.equal(third.code, 0);
  assert.match(third.out, /still failing/);
  // fixed: passes, and unchanged code is not re-verified
  fs.rmSync(path.join(root, 'BROKEN'));
  assert.equal(hook('stop-verify.mjs', { cwd: root }).code, 0);
  const after = runs(root);
  assert.equal(hook('stop-verify.mjs', { cwd: root }).code, 0);
  assert.equal(runs(root), after);
});

test('stop gate skips doc-only changes', () => {
  const root = makeRepo();
  write(root, 'BROKEN', '');
  git(root, 'add', '-A'); git(root, 'commit', '-qm', 'broken');
  hook('log-activity.mjs', { cwd: root, hook_event_name: 'UserPromptSubmit', prompt: 'x' });
  write(root, 'docs/notes.md', '# notes');
  assert.equal(hook('stop-verify.mjs', { cwd: root }).code, 0);
  assert.equal(runs(root), 0);
});

function reviewed(root, branch, sha, extra = '') {
  const day = '2026-11-18';
  write(root, `docs/reviews/${day}-${branch}.md`, `# Review\nHead reviewed: \`${sha}\`\n| # | Sev | Where | Finding | Status |\n|---|---|---|---|---|\n| 1 | P1 | a:1 | x | fixed in abc |\n${extra}\n**PASS**\n`);
  write(root, `docs/qa/${day}-${branch}.md`, '# QA\n');
}

test('ship gate: review coverage survives rebase, catches unreviewed code', () => {
  const root = makeRepo();
  git(root, 'checkout', '-qb', 'feat/x');
  write(root, 'src/a.ts', 'export const a = 1;\n'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'feat: a');
  const head = git(root, 'rev-parse', '--short', 'HEAD').out.trim();
  assert.equal(gate(root, '--base', 'main').code, 1, 'no review yet');
  reviewed(root, 'feat-x', head);
  git(root, 'add', '-A'); git(root, 'commit', '-qm', 'docs: review');
  let r = gate(root, '--base', 'main');
  assert.equal(r.code, 0, r.out);
  // fix(review) commits are allowed
  write(root, 'src/a.ts', 'export const a = 2;\n'); git(root, 'commit', '-qam', 'fix(review): a');
  assert.equal(gate(root, '--base', 'main').code, 0);
  // rebase onto a moved main keeps coverage (patch-ids match)
  git(root, 'checkout', '-q', 'main');
  write(root, 'src/other.ts', 'export const o = 1;\n'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'feat: other');
  git(root, 'checkout', '-q', 'feat/x');
  assert.equal(git(root, 'rebase', '-q', 'main').code, 0);
  r = gate(root, '--base', 'main');
  assert.equal(r.code, 0, `after rebase: ${r.out}`);
  // new unreviewed code fails
  write(root, 'src/b.ts', 'export const b = 1;\n'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'feat: b');
  r = gate(root, '--base', 'main');
  assert.equal(r.code, 1);
  assert.match(r.out, /not covered by the review/);
});

test('ship gate: review files must match the branch exactly; docs-only PRs pass', () => {
  const root = makeRepo();
  git(root, 'checkout', '-qb', 'x');
  write(root, 'src/a.ts', 'export const a = 1;\n'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'feat: a');
  const head = git(root, 'rev-parse', '--short', 'HEAD').out.trim();
  reviewed(root, 'feat-x', head); // another branch's record ends in "-x.md"
  git(root, 'add', '-A'); git(root, 'commit', '-qm', 'docs: other review');
  assert.match(gate(root, '--base', 'main').out, /no docs\/reviews\/<date>-x\.md/);

  git(root, 'checkout', '-q', 'main'); git(root, 'checkout', '-qb', 'docs-only');
  write(root, 'docs/guide.md', '# Guide\n'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'docs: guide');
  const r = gate(root, '--base', 'main');
  assert.equal(r.code, 0, r.out);
});

test('ship gate: migrations require a migration-safety verdict', () => {
  const root = makeRepo();
  git(root, 'checkout', '-qb', 'm');
  write(root, 'db/migrations/001.sql', 'alter table t add column c int;\n'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'feat: m');
  const head = git(root, 'rev-parse', '--short', 'HEAD').out.trim();
  reviewed(root, 'm', head); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'docs: review');
  assert.match(gate(root, '--base', 'main').out, /FAIL\s+migration safety/);
  reviewed(root, 'm', head, 'Migration safety: PASS'); git(root, 'add', '-A'); git(root, 'commit', '-qm', 'docs: review 2');
  assert.equal(gate(root, '--base', 'main').code, 0);
});

test('docs drift: stale after covered code changes, ok after stamp', () => {
  const root = makeRepo();
  write(root, 'docs/arch.md', '# Arch\n<!-- nstack-doc covers="src/**" verified="" -->\n');
  git(root, 'add', '-A'); git(root, 'commit', '-qm', 'docs');
  const docs = (...a) => sh(process.execPath, [path.join(root, '.n-stack/bin/docs.mjs'), ...a], root);
  assert.match(docs('check').out, /unverified/);
  docs('stamp', 'docs/arch.md'); git(root, 'commit', '-qam', 'docs: stamp');
  assert.equal(docs('check').code, 0);
  write(root, 'src/money.ts', 'export const changed = 1;\n'); git(root, 'commit', '-qam', 'feat: change');
  const r = docs('check');
  assert.equal(r.code, 1);
  assert.match(r.out, /stale\s+docs\/arch\.md.*src\/money\.ts/);
});

test('code map: small repos inline, large repos split into an index + areas', async () => {
  const { generate } = await import(pathToFile(path.join(PLUGIN, 'lib', 'codemap.mjs')));
  const small = makeRepo();
  generate(small);
  const map = fs.readFileSync(path.join(small, '.n-stack/tmp/codemap.md'), 'utf8');
  assert.match(map, /src\/money\.ts.*round:1/);

  const big = makeRepo();
  for (let i = 0; i < 320; i++) write(big, `pkg${i % 4}/mod/f${i}.ts`, `export function f${i}() {}\n`);
  write(big, 'pkg0/core.ts', `${Array.from({ length: 30 }, (_, i) => `import { f${i * 4} } from './mod/f${i * 4}';`).join('\n')}\nexport const core = 1;\n`);
  git(big, 'add', '-A'); git(big, 'commit', '-qm', 'many');
  generate(big);
  const index = fs.readFileSync(path.join(big, '.n-stack/tmp/codemap.md'), 'utf8');
  assert.match(index, /## Areas/);
  assert.ok(index.split('\n').length < 120, 'index stays small');
  assert.ok(fs.existsSync(path.join(big, '.n-stack/tmp/codemap/pkg1__mod.md')));
});

function pathToFile(p) { return new URL(`file:///${p.replace(/\\/g, '/').replace(/^\//, '')}`).href; }

// PreToolUse guard. Enforces in code what n-stack's skills say in prose:
//   1. read-only agents stay read-only; the QA tester writes only to scratch
//   2. secret files (.env, keys) are never read or written by an agent
//   3. tests are not weakened (skips, focused tests, removed assertions)
//   4. lint/type suppressions are not added silently
//   5. tests written first by n-test-writer are frozen for the implementer
// Exit 2 blocks the tool call and shows the reason to Claude.
// Override for 3 and 4: the USER creates .n-stack/allow-weaken (valid 60 minutes).
import fs from 'node:fs';
import path from 'node:path';
import {
  readStdinJson, findConfigRoot, mainRoot, loadConfig, relToRoot, isTestFile, isSecretPath, logEvent,
} from '../lib/common.mjs';

const READ_ONLY_AGENTS = ['n-scout', 'n-log-triager', 'n-staff-reviewer', 'n-planner'];
const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);

const SKIP_RE = /\b(?:it|test|describe|context|suite)\.(?:skip|only|todo)\b|\b(?:xit|xtest|xdescribe|fit|fdescribe)\s*\(|@pytest\.mark\.(?:skip|skipif|xfail)\b|\bpytest\.skip\s*\(|@unittest\.skip|@Disabled\b|@Ignore\b|\bt\.Skip(?:Now)?\s*\(/g;
const ASSERT_RE = /\bexpect\s*\(|\bassert\w*\s*[(.]|^\s*assert\s|\.should\b|\bt\.(?:Error|Errorf|Fatal|Fatalf|Fail)\b|\bXCTAssert\w*\s*\(/gm;
const SUPPRESS_RE = /eslint-disable|@ts-ignore|@ts-nocheck|@ts-expect-error|#\s*type:\s*ignore|#\s*noqa|pylint:\s*disable|\/\/\s*nolint|@SuppressWarnings|#!?\[allow\(/g;
const ENV_IN_COMMAND_RE = /(?:^|[\s'"=/\\(])\.env(?:\.[\w.-]+)?(?=$|[\s'";|&>)<])/g;
// Deleting or truncating test files from the shell is weakening too.
const RM_TEST_RE = /\b(?:rm|git\s+rm|del|unlink|truncate)\b[^|;&\n]*(?:\.(?:test|spec)\.[cm]?[jt]sx?\b|(?:^|[\s/])test_[\w-]+\.py\b|_test\.(?:py|go)\b|__tests__\/)/;

const count = (re, text) => (String(text || '').match(re) || []).length;

function deny(root, rule, message, ctx) {
  logEvent(root, { type: 'guard_block', rule, tool: ctx.tool, agent: ctx.agent || 'main', file: ctx.file || null });
  process.stderr.write(`n-stack guard (${rule}): ${message}\n`);
  process.exit(2);
}

// In a linked worktree the override and frozen-test list live in the MAIN checkout.
function overrideActive(roots) {
  return roots.some((r) => {
    try { return Date.now() - fs.statSync(path.join(r, '.n-stack', 'allow-weaken')).mtimeMs < 60 * 60 * 1000; }
    catch { return false; }
  });
}

function frozenTests(roots) {
  const out = new Set();
  for (const r of roots) {
    try {
      const list = JSON.parse(fs.readFileSync(path.join(r, '.n-stack', 'tmp', 'protected-tests.json'), 'utf8'));
      if (Array.isArray(list)) list.forEach((p) => out.add(String(p).replace(/\\/g, '/')));
    } catch { /* none */ }
  }
  return out;
}

/** Text before and after the edit, for counting skips/assertions/suppressions. */
function beforeAfter(tool, input, absFile) {
  if (tool === 'Edit') return [input.old_string || '', input.new_string || ''];
  if (tool === 'MultiEdit') {
    const edits = input.edits || [];
    return [edits.map((e) => e.old_string || '').join('\n'), edits.map((e) => e.new_string || '').join('\n')];
  }
  if (tool === 'Write') {
    let before = '';
    try { before = fs.readFileSync(absFile, 'utf8'); } catch { /* new file */ }
    return [before, input.content || ''];
  }
  return ['', ''];
}

const payload = await readStdinJson();
const root = findConfigRoot(payload.cwd);
if (!root || !loadConfig(root)) process.exit(0); // not an n-stack project: stay out of the way
const roots = [...new Set([root, mainRoot(root)])];

const tool = payload.tool_name || '';
const input = payload.tool_input || {};
const agent = String(payload.agent_type || '');
const agentName = agent.split(':').pop();
const rawPath = input.file_path || input.notebook_path || input.path || '';
const absFile = rawPath ? path.resolve(root, rawPath) : '';
const rel = absFile ? relToRoot(root, absFile) : null;
const ctx = { tool, agent, file: rel };

// 1. Read-only agents.
if (READ_ONLY_AGENTS.includes(agentName) && (WRITE_TOOLS.has(tool) || tool === 'Bash')) {
  deny(root, 'read-only-agent', `${agentName} is a read-only agent; it may not use ${tool}. Report findings instead.`, ctx);
}
if (agentName === 'n-qa-tester' && WRITE_TOOLS.has(tool) && !(rel || '').startsWith('.n-stack/tmp/')) {
  deny(root, 'qa-scratch-only', 'n-qa-tester may only write inside .n-stack/tmp/. It reports bugs; it does not change product code or tests.', ctx);
}
if (agentName === 'n-test-writer' && WRITE_TOOLS.has(tool) && rel && !isTestFile(rel) && !rel.startsWith('.n-stack/tmp/')) {
  deny(root, 'test-writer-tests-only', `n-test-writer writes tests only; ${rel} is not a test file. Leave the implementation to n-implementer.`, ctx);
}

// 2. Secrets.
if (rel && (WRITE_TOOLS.has(tool) || tool === 'Read' || tool === 'Grep') && isSecretPath(rel)) {
  deny(root, 'secret-file', `${rel} holds secrets and is off limits to agents. Use .env.example for variable names; ask the user to set values.`, ctx);
}
if (tool === 'Bash') {
  const cmd = String(input.command || '');
  const hits = (cmd.match(ENV_IN_COMMAND_RE) || []).map((m) => m.trim().replace(/^['"=/\\(]/, ''))
    .filter((m) => !/\.env\.(example|sample|template|defaults)$/i.test(m));
  if (hits.length) {
    deny(root, 'secret-file', `this command touches ${hits.join(', ')}, which holds secrets. Use .env.example for variable names.`, ctx);
  }
  if (/allow-weaken/.test(cmd)) {
    deny(root, 'override-is-human-only', 'only the user may create .n-stack/allow-weaken. Ask them if a weakening is truly intended.', ctx);
  }
  if (RM_TEST_RE.test(cmd) && !overrideActive(roots)) {
    deny(root, 'test-deleted', 'this command deletes or truncates test files. If a test is obsolete, explain why to the user and ask them to create .n-stack/allow-weaken.', ctx);
  }
  process.exit(0);
}
if (!WRITE_TOOLS.has(tool) || !rel) process.exit(0);

if (rel.startsWith('.n-stack/allow')) {
  deny(root, 'override-is-human-only', 'only the user may create the override file. Ask them if a weakening is truly intended.', ctx);
}

// 5. Frozen tests (test-first mode).
if (agentName === 'n-implementer' && frozenTests(roots).has(rel)) {
  deny(root, 'frozen-test', `${rel} was written first by n-test-writer and is frozen. Make the code pass the test; if the test itself is wrong, report STATUS: blocked with the reason.`, ctx);
}

if (overrideActive(roots)) {
  logEvent(root, { type: 'guard_override', tool, agent: agent || 'main', file: rel });
  process.exit(0);
}

const [before, after] = beforeAfter(tool, input, absFile);

// 3. Test weakening.
if (isTestFile(rel)) {
  const addedSkips = count(SKIP_RE, after) - count(SKIP_RE, before);
  if (addedSkips > 0) {
    deny(root, 'test-skip', `this edit adds ${addedSkips} skipped/focused/todo test marker(s) to ${rel}. Fix the code or the test instead. If skipping is truly intended, ask the user to create .n-stack/allow-weaken.`, ctx);
  }
  const removedAsserts = count(ASSERT_RE, before) - count(ASSERT_RE, after);
  if (removedAsserts > 0) {
    deny(root, 'assertion-removed', `this edit removes ${removedAsserts} assertion(s) from ${rel}. Tests must not be loosened to get green. If this is a deliberate refactor, ask the user to create .n-stack/allow-weaken.`, ctx);
  }
}

// 4. Suppressions.
const addedSuppress = count(SUPPRESS_RE, after) - count(SUPPRESS_RE, before);
if (addedSuppress > 0) {
  deny(root, 'suppression', `this edit adds ${addedSuppress} lint/type suppression(s) to ${rel}. Fix the underlying error. If a suppression is truly needed, explain why to the user and ask them to create .n-stack/allow-weaken.`, ctx);
}

process.exit(0);

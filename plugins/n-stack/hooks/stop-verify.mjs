// Stop gate: Claude may not end its turn while the project's verify command is red on
// changes made DURING this turn.
//
// - Only changes made this turn count: the UserPromptSubmit hook records the working-tree
//   fingerprint when your message arrives. Your own red WIP doesn't block Claude from
//   answering a question; any edit Claude makes (Edit, Write or Bash) does.
// - Cached per fingerprint: unchanged code is never re-verified, pass or fail.
// - Doc-only changes skip verify.
// - Loop safety: after 2 blocks on the same unchanged code, the stop is allowed with a
//   visible warning; Claude Code's own 8-continuation cap is the backstop.
import fs from 'node:fs';
import path from 'node:path';
import {
  readStdinJson, findConfigRoot, loadConfig, fingerprint, shell, firstLines, tmpDir, readState, writeState, logEvent,
} from '../lib/common.mjs';

const DOC_ONLY_RE = /(^docs\/)|(\.(md|mdx|txt)$)|(^\.n-stack\/)/i;

function block(root, state, fp, command, output) {
  state.stopBlocks ||= {};
  state.stopBlocks[fp] = (state.stopBlocks[fp] || 0) + 1;
  writeState(root, state);
  logEvent(root, { type: 'verify', status: 'fail', via: 'stop', block: state.stopBlocks[fp] });
  process.stderr.write(
    `n-stack Stop gate: \`${command}\` fails on the changes made this turn, so the work is not done yet.\n`
    + `${firstLines(output.trim(), 25)}\n`
    + 'Full log: .n-stack/tmp/last-verify.log (if it is long, dispatch n-stack:n-log-triager on it).\n'
    + 'Find and fix the cause; never weaken or skip tests to get green. If the user explicitly asked to stop with failing code, say so plainly in your final message.\n',
  );
  process.exit(2);
}

const payload = await readStdinJson();
const root = findConfigRoot(payload.cwd);
const config = root && loadConfig(root);
if (!config || config._error || !config.verify || config.stopVerify === false) process.exit(0);
if (Array.isArray(payload.background_tasks) && payload.background_tasks.length) process.exit(0);

const { fp, changed, head } = fingerprint(root);
const state = readState(root);
const last = state.lastVerify || {};
const logPath = path.join(tmpDir(root), 'last-verify.log');

if (state.turnStartFp && state.turnStartFp === fp) process.exit(0); // nothing changed this turn
if (last.fingerprint === fp && last.status === 'pass') process.exit(0);
if (changed.length && changed.every((f) => DOC_ONLY_RE.test(f))) process.exit(0);

// Same code already failed: don't re-run verify (it can take minutes); reuse the log.
if (last.fingerprint === fp && last.status === 'fail') {
  if ((state.stopBlocks?.[fp] || 0) >= 2) {
    process.stdout.write(JSON.stringify({
      systemMessage: `n-stack: verify (${config.verify}) is still failing on these changes; allowing the stop after 2 attempts. Log: .n-stack/tmp/last-verify.log`,
    }));
    process.exit(0);
  }
  let cached = '';
  try { cached = fs.readFileSync(logPath, 'utf8'); } catch { /* gone */ }
  block(root, state, fp, config.verify, cached);
}

const r = shell(config.verify, { cwd: root, timeoutMs: (config.verifyTimeoutSec || 600) * 1000 });
fs.writeFileSync(logPath, `$ ${config.verify}\n${r.output}`);
state.lastVerify = { status: r.code === 0 ? 'pass' : 'fail', fingerprint: fp, head, at: new Date().toISOString() };

if (r.code === 0) {
  if (state.stopBlocks) delete state.stopBlocks[fp];
  writeState(root, state);
  logEvent(root, { type: 'verify', status: 'pass', via: 'stop' });
  process.exit(0);
}
block(root, state, fp, config.verify, r.output);

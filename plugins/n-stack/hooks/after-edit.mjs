// PostToolUse after Edit/Write: format the file, then run the fast per-file check
// (lint, or a type check for that file) from .n-stack/config.json. A failure is shown
// to Claude immediately (exit 2), so errors are fixed while the context is fresh
// instead of piling up until the end-of-task verify.
//
// config.json:
//   "format":     { ".ts,.tsx,.js": "npx prettier --write {file}" }
//   "fileChecks": { ".ts,.tsx,.js": "npx eslint --max-warnings=0 {file}", ".py": "ruff check {file}" }
//   "fileCheckTimeoutSec": 60
import path from 'node:path';
import {
  readStdinJson, findConfigRoot, loadConfig, relToRoot, shell, firstLines, logEvent, readState, writeState, IS_WIN,
} from '../lib/common.mjs';

function commandFor(table, ext) {
  for (const [exts, cmd] of Object.entries(table || {})) {
    if (exts.split(',').map((e) => e.trim().toLowerCase()).includes(ext)) return cmd;
  }
  return null;
}

const quote = (p) => (IS_WIN ? `"${p}"` : `'${p.replace(/'/g, `'\\''`)}'`);

const payload = await readStdinJson();
const root = findConfigRoot(payload.cwd);
if (!root) process.exit(0);
const config = loadConfig(root);
if (!config || config._error) process.exit(0);

const file = payload.tool_input?.file_path;
const rel = relToRoot(root, file ? path.resolve(root, file) : '');
if (!rel || rel.startsWith('.n-stack/') || rel.includes('node_modules/')) process.exit(0);

// Remember that code changed, so the Stop gate knows a verify is due.
const state = readState(root);
state.lastEditAt = new Date().toISOString();
writeState(root, state);

const ext = path.extname(rel).toLowerCase();
const timeoutMs = (config.fileCheckTimeoutSec || 60) * 1000;

const fmt = commandFor(config.format, ext);
if (fmt) shell(fmt.replaceAll('{file}', quote(rel)), { cwd: root, timeoutMs }); // best effort

const check = commandFor(config.fileChecks, ext);
if (!check) process.exit(0);

const cmd = check.replaceAll('{file}', quote(rel));
const r = shell(cmd, { cwd: root, timeoutMs });
if (r.code === 0) process.exit(0);

logEvent(root, { type: 'after_edit_fail', file: rel, agent: payload.agent_type || 'main' });
process.stderr.write(
  `n-stack after-edit check failed for ${rel}\n$ ${cmd}\n${firstLines(r.output.trim(), 40)}\n`
  + 'Fix this now, before moving on. Do not silence it with a suppression comment.\n',
);
process.exit(2);

// UserPromptSubmit + SubagentStop.
// 1. Records the working-tree fingerprint when the user's message arrives, so the Stop gate
//    only judges changes made during this turn (not the user's own red WIP).
// 2. Evidence for /n-retro: which n-stack commands run and which agents finish. Names only,
//    never prompt text.
// Prints nothing (UserPromptSubmit stdout would be added to Claude's context).
import { readStdinJson, findConfigRoot, fingerprint, readState, writeState, logEvent } from '../lib/common.mjs';

const payload = await readStdinJson();
const root = findConfigRoot(payload.cwd);
if (!root) process.exit(0);

try {
  if (payload.hook_event_name === 'UserPromptSubmit') {
    const state = readState(root);
    state.turnStartFp = fingerprint(root).fp;
    writeState(root, state);
    const m = String(payload.prompt || '').trim().match(/^\/((?:n-stack:)?(?:n-[\w-]+|nstack))\b/);
    if (m) logEvent(root, { type: 'command', name: m[1].replace(/^n-stack:/, ''), session: payload.session_id });
  } else if (payload.hook_event_name === 'SubagentStop') {
    const agent = String(payload.agent_type || '');
    if (/n-/.test(agent)) logEvent(root, { type: 'agent_done', agent: agent.split(':').pop(), session: payload.session_id });
  }
} catch { /* never break the session over logging */ }
process.exit(0);

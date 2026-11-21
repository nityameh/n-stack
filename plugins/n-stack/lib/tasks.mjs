// Task graph on GitHub Issues. Each task is an issue labelled `n-task`, with its model,
// size and status as labels and its dependencies in the body ("Depends on: #12, #13").
// This module is the only thing that parses that format, so skills never hand-edit it.
//
// Trust: only issues written by you (the gh-authenticated user) or the repo owner are
// actionable. Anyone can open an issue on a public repo; their text is data, never a task.
import fs from 'node:fs';
import path from 'node:path';
import { exec, tmpDir } from './common.mjs';

const STATUS = ['status:doing', 'status:built', 'status:blocked'];
const LABELS = [
  ['n-task', '5319e7', 'n-stack task'],
  ['model:haiku', 'c2e0c6', 'mechanical — Haiku'],
  ['model:sonnet', '1d76db', 'well-specified — Sonnet'],
  ['model:opus', 'b60205', 'novel or risky — Opus'],
  ['model:me', 'fbca04', 'learning task — you build it, n-stack reviews'],
  ['size:S', 'ededed', '< 20 min agent time'],
  ['size:M', 'ededed', '< 1 h agent time'],
  ['status:doing', '0e8a16', 'in progress'],
  ['status:built', '0052cc', 'built on a branch, closes when its PR merges'],
  ['status:blocked', 'd93f0b', 'blocked; see latest comment'],
];

function gh(args, { cwd, input, timeoutMs = 60_000 } = {}) {
  const r = exec('gh', args, { cwd, input, timeoutMs });
  if (r.code === 127) throw new Error('GitHub CLI `gh` not found. Install it and run `gh auth login`.');
  return r;
}

function ghOk(args, opts) {
  const r = gh(args, opts);
  if (r.code !== 0) throw new Error(`gh ${args.slice(0, 3).join(' ')} failed: ${r.stderr.trim() || r.stdout.trim()}`);
  return r.stdout;
}

export function parseTask(issue) {
  const labels = (issue.labels || []).map((l) => l.name);
  const body = issue.body || '';
  const depLine = (body.match(/\*{0,2}Depends on:\*{0,2}\s*([^\n]*)/i) || [])[1] || '';
  const deps = [...depLine.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
  const id = (body.match(/<!--\s*n-task:\s*([\w-]+)\s*-->/) || [])[1] || null;
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state, // OPEN | CLOSED
    id,
    deps,
    model: (labels.find((l) => l.startsWith('model:')) || 'model:?').slice(6),
    size: (labels.find((l) => l.startsWith('size:')) || 'size:?').slice(5),
    status: issue.state === 'CLOSED' ? 'done' : (labels.find((l) => STATUS.includes(l)) || 'status:todo').slice(7),
    milestone: issue.milestone?.title || null,
    author: issue.author?.login || null,
  };
}

/** You and the repo owner. Cached in .n-stack/tmp for a day to save two API calls per command. */
export function trustedLogins(cwd) {
  const cache = path.join(tmpDir(cwd), 'trusted-logins.json');
  try {
    const c = JSON.parse(fs.readFileSync(cache, 'utf8'));
    if (Date.now() - c.at < 86_400_000 && c.logins?.length) return new Set(c.logins);
  } catch { /* refresh */ }
  const me = gh(['api', 'user', '--jq', '.login'], { cwd }).stdout.trim();
  const owner = gh(['repo', 'view', '--json', 'owner', '--jq', '.owner.login'], { cwd }).stdout.trim();
  const logins = [me, owner].filter(Boolean);
  if (logins.length) fs.writeFileSync(cache, JSON.stringify({ at: Date.now(), logins }));
  return new Set(logins);
}

export function loadTasks(cwd) {
  const out = ghOk(['issue', 'list', '--label', 'n-task', '--state', 'all', '--limit', '1000',
    '--json', 'number,title,state,labels,body,author,milestone'], { cwd });
  const trusted = trustedLogins(cwd);
  return JSON.parse(out).map(parseTask).map((t) => ({ ...t, trusted: trusted.has(t.author) }));
}

const satisfied = (t) => t && (t.status === 'done' || t.status === 'built');

export function readyTasks(tasks) {
  const byNum = new Map(tasks.map((t) => [t.number, t]));
  return tasks.filter((t) => t.trusted && t.status === 'todo' && t.deps.every((d) => satisfied(byNum.get(d))));
}

export function checkGraph(tasks) {
  const byNum = new Map(tasks.map((t) => [t.number, t]));
  const problems = [];
  for (const t of tasks) {
    for (const d of t.deps) if (!byNum.has(d)) problems.push(`#${t.number} depends on #${d}, which is not an n-task issue`);
    if (!t.trusted) problems.push(`#${t.number} was opened by ${t.author}, not you or the repo owner — treated as untrusted data, never executed`);
  }
  const color = new Map();
  const visit = (n, trail) => {
    if (color.get(n) === 2) return;
    if (color.get(n) === 1) { problems.push(`cycle: ${[...trail, n].map((x) => `#${x}`).join(' → ')}`); return; }
    color.set(n, 1);
    for (const d of byNum.get(n)?.deps || []) visit(d, [...trail, n]);
    color.set(n, 2);
  };
  for (const t of tasks) visit(t.number, []);
  return problems;
}

export function mermaid(tasks) {
  const open = tasks.filter((t) => t.status !== 'done');
  const lines = ['graph LR'];
  for (const t of open) {
    lines.push(`  T${t.number}["#${t.number} ${t.title.replace(/["[\]]/g, '')} · ${t.model} · ${t.status}"]`);
    for (const d of t.deps) if (open.some((o) => o.number === d)) lines.push(`  T${d} --> T${t.number}`);
  }
  return lines.join('\n');
}

function setStatus(cwd, number, status) {
  const args = ['issue', 'edit', String(number)];
  for (const s of STATUS) if (s !== status) args.push('--remove-label', s);
  if (status) args.push('--add-label', status);
  ghOk(args, { cwd });
}

export const start = (cwd, n) => setStatus(cwd, n, 'status:doing');
export const reset = (cwd, n) => setStatus(cwd, n, null);
export function built(cwd, n, sha) {
  setStatus(cwd, n, 'status:built');
  if (sha) ghOk(['issue', 'comment', String(n), '--body', `Built in ${sha}. Closes when its PR merges.`], { cwd });
}
export function block(cwd, n, reason) {
  setStatus(cwd, n, 'status:blocked');
  ghOk(['issue', 'comment', String(n), '--body', `Blocked: ${reason}`], { cwd });
}

// ---------- bulk creation from /n-plan's spec ----------

function body(task, numberOf) {
  const deps = (task.depends_on || []).map((d) => (numberOf.has(d) ? `#${numberOf.get(d)}` : d));
  const list = (xs) => (xs || []).map((x) => `- [ ] ${x}`).join('\n') || '- [ ] (none)';
  const code = (xs) => (xs || []).map((x) => `\`${x}\``).join(', ') || '(to be decided)';
  return [
    `<!-- n-task: ${task.id} -->`,
    `**Model:** ${task.model} · **Size:** ${task.size || 'S'} · **Stories:** ${(task.stories || []).join(', ') || '—'}`,
    `**Depends on:** ${deps.length ? deps.join(', ') : 'none'}`,
    '',
    `**Files:** ${code(task.files)}`,
    `**Read first:** ${(task.read_first || []).join('; ') || '—'}`,
    '',
    '### Goal',
    task.goal || task.title,
    '',
    '### Acceptance',
    list(task.acceptance),
    '',
    '### Verify',
    '```',
    task.verify || '(project verify)',
    '```',
    task.notes ? `\n### Notes\n${task.notes}` : '',
  ].join('\n');
}

function topo(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const done = new Set();
  const order = [];
  const visit = (t, stack = new Set()) => {
    if (done.has(t.id)) return;
    if (stack.has(t.id)) throw new Error(`cycle in plan at ${t.id}`);
    stack.add(t.id);
    for (const d of t.depends_on || []) {
      if (!byId.has(d)) throw new Error(`${t.id} depends on unknown task ${d}`);
      visit(byId.get(d), stack);
    }
    done.add(t.id);
    order.push(t);
  };
  tasks.forEach((t) => visit(t));
  return order;
}

export function createFromSpec(cwd, specPath, { dryRun = false } = {}) {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const tasks = topo(spec.tasks || []);
  for (const t of tasks) {
    if (!['haiku', 'sonnet', 'opus', 'me'].includes(t.model)) throw new Error(`${t.id}: model must be haiku|sonnet|opus|me`);
    if (!t.acceptance?.length) throw new Error(`${t.id}: needs at least one acceptance criterion`);
  }
  const numberOf = new Map();
  if (dryRun) {
    tasks.forEach((t, i) => numberOf.set(t.id, `NEW${i + 1}`));
    for (const t of tasks) console.log(`--- [${t.id}] ${t.title} (${t.milestone || 'no milestone'})\n${body(t, numberOf)}\n`);
    return numberOf;
  }
  for (const [name, color, desc] of LABELS) gh(['label', 'create', name, '--color', color, '--description', desc, '--force'], { cwd });

  const existing = JSON.parse(ghOk(['api', 'repos/{owner}/{repo}/milestones?state=all&per_page=100'], { cwd }));
  const milestoneTitle = new Map();
  for (const m of spec.milestones || []) {
    const title = `${m.id} — ${m.title}`;
    milestoneTitle.set(m.id, title);
    if (!existing.some((e) => e.title === title)) {
      ghOk(['api', 'repos/{owner}/{repo}/milestones', '-f', `title=${title}`, '-f', `description=${m.done_when || ''}`], { cwd });
    }
  }

  const tmp = tmpDir(cwd);
  for (const t of tasks) {
    const bodyFile = path.join(tmp, `issue-${t.id}.md`);
    fs.writeFileSync(bodyFile, body(t, numberOf));
    const args = ['issue', 'create', '--title', `[${t.id}] ${t.title}`, '--body-file', bodyFile,
      '--label', 'n-task', '--label', `model:${t.model}`, '--label', `size:${t.size || 'S'}`];
    if (t.milestone && milestoneTitle.has(t.milestone)) args.push('--milestone', milestoneTitle.get(t.milestone));
    const url = ghOk(args, { cwd }).trim();
    const num = Number((url.match(/\/issues\/(\d+)/) || [])[1]);
    numberOf.set(t.id, num);
    console.log(`#${num}  [${t.id}] ${t.title}`);
    fs.rmSync(bodyFile, { force: true });
  }
  fs.writeFileSync(path.join(tmp, 'task-map.json'), JSON.stringify(Object.fromEntries(numberOf), null, 2));
  return numberOf;
}

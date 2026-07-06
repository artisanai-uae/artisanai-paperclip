/*
 * Paperclip REST adapter for Atlas.
 *
 * Maps a running Paperclip server's entities onto the Atlas model and wires
 * Atlas user intents back to the API. Written against the route shapes in
 * paperclipai/paperclip (server/src/routes):
 *
 *   GET  /api/companies/:companyId          -> company (name, goal, ...)
 *   GET  /api/companies/:companyId/agents   -> agents (org structure)
 *   GET  /api/companies/:companyId/issues   -> hierarchical tasks
 *
 * Field names on those payloads evolve with the host; the mappers below are
 * small and defensive on purpose — pin them to your host version and adjust
 * in one place. Everything else (rendering, interactions) stays untouched.
 *
 * Usage:
 *   import { mountAtlas } from './atlas.js';
 *   import { createPaperclipAdapter } from './paperclip-adapter.js';
 *
 *   const adapter = createPaperclipAdapter({ companyId });
 *   const model = await adapter.load();
 *   const atlas = mountAtlas(el, { model, simulate: false, onAction: adapter.onAction });
 *   adapter.start(atlas);            // begin polling for live changes
 *   // later: adapter.stop(); atlas.destroy();
 */

export function createPaperclipAdapter({
  baseUrl = '',
  companyId,
  fetchImpl = globalThis.fetch.bind(globalThis),
  pollMs = 5000,
} = {}) {
  if (!companyId) throw new Error('createPaperclipAdapter: companyId is required');
  const api = p => `${baseUrl}/api${p}`;
  let timer = null;
  let prev = null;

  async function getJson(path) {
    const res = await fetchImpl(api(path), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return res.json();
  }

  const asArray = x => Array.isArray(x) ? x : (x?.items || x?.data || x?.agents || x?.issues || []);

  function mapAgent(a) {
    return {
      id: String(a.id),
      name: a.name || a.displayName || 'Agent',
      role: a.role || a.title || a.adapterType || 'Agent',
      parentId: a.managerId || a.reportsToId || a.parentAgentId || null,
      adapter: a.adapterType || a.adapter || 'Agent',
      budget: a.monthlyBudgetUsd ?? a.budgetUsd ?? a.budget ?? 300,
      spent: a.spentThisMonthUsd ?? a.costMonthUsd ?? a.spent ?? 0,
      beatEvery: a.heartbeatSeconds ?? a.heartbeatIntervalSec ?? 60,
      status: a.paused ? 'paused' : (a.status === 'stopped' ? 'stopped' : 'running'),
    };
  }

  function mapIssue(t) {
    const s = (t.status || t.state || '').toLowerCase();
    return {
      id: String(t.id),
      title: t.title || t.name || 'Untitled task',
      ownerId: t.assigneeId != null ? String(t.assigneeId) : null,
      parentId: t.parentId != null ? String(t.parentId) : (t.parentIssueId != null ? String(t.parentIssueId) : null),
      status: /done|closed|completed/.test(s) ? 'done'
        : /review|approval/.test(s) ? 'review'
        : /block/.test(s) ? 'blocked' : 'active',
      progress: t.progress,
    };
  }

  async function load() {
    const [companyRes, agentsRes, issuesRes] = await Promise.all([
      getJson(`/companies/${companyId}`),
      getJson(`/companies/${companyId}/agents`),
      getJson(`/companies/${companyId}/issues`),
    ]);
    const company = companyRes.company || companyRes;
    return {
      company: {
        name: company.name || 'Company',
        goal: company.goal || company.mission || 'Company goal',
        mrr: company.mrrUsd ?? company.mrr ?? 0,
        mrrTarget: company.mrrTargetUsd ?? company.mrrTarget ?? 1_000_000,
      },
      agents: asArray(agentsRes).map(mapAgent),
      tasks: asArray(issuesRes).map(mapIssue),
    };
  }

  /* Poll and diff: emit granular applyEvent calls so the map animates the
     delta instead of re-mounting. */
  async function tick(atlas) {
    const model = await load();
    if (prev) {
      const prevAgents = new Map(prev.agents.map(a => [a.id, a]));
      for (const a of model.agents) {
        const was = prevAgents.get(a.id);
        if (!was) { atlas.applyEvent({ type: 'feed', icon: '＋', html: `<b>${a.name}</b> joined the org` }); continue; }
        if (a.spent > was.spent) atlas.applyEvent({ type: 'beat', agentId: a.id, cost: a.spent - was.spent });
        if (a.status !== was.status || a.budget !== was.budget) {
          atlas.applyEvent({ type: 'agent', agentId: a.id, patch: { status: a.status, budget: a.budget, spent: a.spent } });
        }
      }
      const prevTasks = new Map(prev.tasks.map(t => [t.id, t]));
      for (const t of model.tasks) {
        const was = prevTasks.get(t.id);
        if (!was) atlas.applyEvent({ type: 'task', task: t });
        else if (t.status === 'done' && was.status !== 'done') atlas.applyEvent({ type: 'taskDone', taskId: t.id });
        else if (t.status !== was.status) atlas.applyEvent({ type: 'task', task: t });
      }
      if (model.company.mrr !== prev.company.mrr) {
        atlas.applyEvent({ type: 'company', patch: { mrr: model.company.mrr } });
      }
    }
    prev = model;
  }

  function start(atlas) {
    stop();
    load().then(m => { prev = m; }).catch(() => {});
    timer = setInterval(() => tick(atlas).catch(err => console.warn('[atlas-adapter] poll failed:', err.message)), pollMs);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  /* Atlas user intents -> Paperclip API. Best-effort: log and continue when
     the host rejects (the next poll re-syncs the map to server truth). */
  async function onAction(action) {
    const patchAgent = (id, body) => fetchImpl(api(`/agents/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    try {
      switch (action.type) {
        case 'reorg':  await patchAgent(action.agentId, { managerId: action.newManagerId }); break;
        case 'budget': await patchAgent(action.agentId, { monthlyBudgetUsd: action.budget }); break;
        case 'pause':  await patchAgent(action.agentId, { paused: true }); break;
        case 'resume': await patchAgent(action.agentId, { paused: false }); break;
        case 'beat':   await fetchImpl(api(`/agents/${action.agentId}/heartbeat`), { method: 'POST' }); break;
        case 'hire':
          await fetchImpl(api(`/companies/${companyId}/agents`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...action.agent, managerId: action.managerId }),
          });
          break;
        case 'fire': await fetchImpl(api(`/agents/${action.agentId}`), { method: 'DELETE' }); break;
      }
    } catch (err) {
      console.warn(`[atlas-adapter] ${action.type} not applied:`, err.message);
    }
  }

  return { load, start, stop, onAction };
}

export default createPaperclipAdapter;

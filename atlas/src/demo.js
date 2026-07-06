/*
 * Demo fixture for Paperclip Atlas: "NoteWiz, Inc.", the dream-scenario
 * company from Paperclip's own README. Use with { simulate: true } to get
 * a living map without a Paperclip server.
 */
export function demoModel() {
  return {
    company: {
      name: 'NoteWiz, Inc.',
      goal: 'Build the #1 AI note-taking app to $1M MRR',
      mrr: 18_420,
      mrrTarget: 1_000_000,
      revenueRate: 9,
    },
    agents: [
      { id: 'ceo',   name: 'Atlas',  role: 'CEO',               parentId: null,  adapter: 'Claude Code', budget: 1200, spent: 520, beatEvery: 26 },
      { id: 'cto',   name: 'Forge',  role: 'CTO',               parentId: 'ceo', adapter: 'OpenClaw',    budget: 900,  spent: 475, beatEvery: 22 },
      { id: 'cmo',   name: 'Echo',   role: 'CMO',               parentId: 'ceo', adapter: 'OpenClaw',    budget: 800,  spent: 522, beatEvery: 24, revenue: true },
      { id: 'cfo',   name: 'Ledger', role: 'CFO · Ops',         parentId: 'ceo', adapter: 'Script',      budget: 250,  spent: 96,  beatEvery: 40 },
      { id: 'iris',  name: 'Iris',   role: 'Product Designer',  parentId: 'ceo', adapter: 'Claude Code', budget: 400,  spent: 148, beatEvery: 28 },
      { id: 'bolt',  name: 'Bolt',   role: 'Backend Engineer',  parentId: 'cto', adapter: 'Codex',       budget: 600,  spent: 260, beatEvery: 16 },
      { id: 'vec',   name: 'Vector', role: 'Frontend Engineer', parentId: 'cto', adapter: 'Claude Code', budget: 600,  spent: 319, beatEvery: 15 },
      { id: 'patch', name: 'Patch',  role: 'QA Engineer',       parentId: 'cto', adapter: 'Cursor',      budget: 350,  spent: 141, beatEvery: 30 },
      { id: 'quill', name: 'Quill',  role: 'Content Writer',    parentId: 'cmo', adapter: 'Claude Code', budget: 300,  spent: 93,  beatEvery: 26 },
      { id: 'prism', name: 'Prism',  role: 'Paid Ads',          parentId: 'cmo', adapter: 'Script',      budget: 700,  spent: 625, beatEvery: 18 },
    ],
    tasks: [
      { id: 'rev',      ownerId: 'ceo',   title: 'Get revenue to $2,000 this week' },
      { id: 'ship',     ownerId: 'ceo',   title: 'Ship v1.3 with AI meeting summaries' },
      { id: 'grow',     ownerId: 'cmo',   title: 'Grow new signups by 100 users',               parentId: 'rev' },
      { id: 'ads',      ownerId: 'prism', title: 'Create Facebook ads for NoteWiz',             parentId: 'grow' },
      { id: 'research', ownerId: 'prism', title: 'Research the Facebook ads Granola uses',      parentId: 'ads' },
      { id: 'launch',   ownerId: 'quill', title: 'Write launch post: “Meetings, remembered”',   parentId: 'grow' },
      { id: 'seo',      ownerId: 'quill', title: 'SEO pass on /vs-notion comparison page',      parentId: 'grow', status: 'review' },
      { id: 'sum',      ownerId: 'cto',   title: 'Build AI summary pipeline',                   parentId: 'ship' },
      { id: 'stream',   ownerId: 'bolt',  title: 'Stream Whisper transcripts into summarizer',  parentId: 'sum' },
      { id: 'latency',  ownerId: 'bolt',  title: 'Cut summary latency below 3s',                parentId: 'sum',  status: 'review' },
      { id: 'sumui',    ownerId: 'vec',   title: 'Summary review UI with inline edits',         parentId: 'sum' },
      { id: 'crash',    ownerId: 'vec',   title: 'Fix mobile capture crash (#412)',             parentId: 'ship', status: 'blocked' },
      { id: 'qa',       ownerId: 'patch', title: 'Regression suite for summary quality',        parentId: 'sum' },
      { id: 'onboard',  ownerId: 'iris',  title: 'Redesign onboarding to first-note < 60s',     parentId: 'ship' },
      { id: 'report',   ownerId: 'cfo',   title: 'Weekly spend report to the board' },
      { id: 'recon',    ownerId: 'cfo',   title: 'Reconcile API invoices vs meter',             status: 'done' },
    ],
  };
}

export default demoModel;

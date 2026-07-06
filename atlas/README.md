# Paperclip Atlas

A living mindmap/orgchart command surface for [Paperclip](https://github.com/paperclipai/paperclip) companies: the mission at the root, agents as instrument nodes (heartbeat pulses, conic budget rings, status colors), tasks tracing their why-chain back to the goal, and the whole org manageable by direct manipulation — fold branches, drag agents to new managers, pause/fund/hire on the node.

Zero dependencies. One ES module.

## Layout

```
atlas/
  index.html                 standalone demo (open via any static server)
  src/
    atlas.js                 the engine — embeddable ES module, styles included
    demo.js                  NoteWiz fixture (Paperclip's README dream scenario)
    paperclip-adapter.js     Paperclip REST -> Atlas model + action wiring
  plugin/                    Paperclip plugin package (page slot at /atlas)
```

## Use it standalone

```bash
python3 -m http.server 8931 --directory atlas
# open http://localhost:8931
```

## Embed it anywhere

```js
import { mountAtlas } from './src/atlas.js';

const atlas = mountAtlas(document.querySelector('#host'), {
  model,                 // see "Model" below
  simulate: false,       // true = built-in demo simulator
  layout: 'tree',        // 'tree' (hierarchy) | 'radial' (constellation)
  onAction: action => {  // user intents, apply them to your backend
    // { type: 'reorg'|'hire'|'fire'|'pause'|'resume'|'beat'|'budget', ... }
  },
});

// push live changes in:
atlas.applyEvent({ type: 'beat', agentId: 'a1', cost: 4.2 });
atlas.applyEvent({ type: 'taskDone', taskId: 't9' });
atlas.applyEvent({ type: 'agent', agentId: 'a1', patch: { status: 'paused' } });
atlas.applyEvent({ type: 'company', patch: { mrr: 19200 } });

atlas.select('a1');      // unfold + fly to an agent
atlas.fit();             // frame the whole org
atlas.destroy();         // full teardown (styles stay, one <style> per document)
```

The engine renders inside its container (`position: absolute` internals, container queries for responsive behavior, all styles scoped under `.pc-atlas`), so it can sit inside any app shell without leaking styles or listening globally.

## Model

```js
{
  company: { name, goal, mrr?, mrrTarget?, revenueRate? },
  agents:  [{ id, name, role, parentId?,        // null/absent = reports to the board
              adapter?, budget?, spent?, beatEvery?, status?, glyph?, revenue? }],
  tasks:   [{ id, title, ownerId, parentId?,    // parent task; absent = the company goal
              status?,   // active | review | blocked | done
              progress? }],
}
```

`revenue: true` on an agent (or any ancestor) attributes completed work to MRR in the simulator.

## Bolt onto a Paperclip install

Two paths, per Paperclip's [plugin spec](https://github.com/paperclipai/paperclip/blob/master/doc/plugins/PLUGIN_SPEC.md):

**1. As a plugin (recommended).** `plugin/` is a plugin package exposing a `page` UI slot at route `atlas`. From a Paperclip source checkout:

```bash
cp -r atlas /path/to/paperclip/packages/plugins/atlas-view
cd /path/to/paperclip/packages/plugins/atlas-view/plugin
pnpm install && pnpm build      # tsc + copies the engine into dist/ui/
```

then register it following `doc/plugins/LOCAL_PLUGIN_DEVELOPMENT.md`. The page component (`AtlasPage`) loads the company through the ordinary HTTP API via `paperclip-adapter.js`, polls for deltas, and animates them onto the map; user actions (re-org, budget, pause, hire, fire) PATCH back. With no `companyId` in context it falls back to the demo model.

**2. As a component in the core UI.** The engine is framework-free; in `ui/` React code:

```tsx
useEffect(() => {
  const atlas = mountAtlas(ref.current, { model, simulate: false, onAction });
  return () => atlas.destroy();
}, []);
```

> **Note.** `paperclip-adapter.js` maps field names defensively (several fallbacks per field) but Paperclip's API is moving; pin the two mapper functions (`mapAgent`, `mapIssue`) to your host version. Endpoints used: `GET/api/companies/:id`, `…/agents`, `…/issues`, `PATCH /api/agents/:id`, `POST …/heartbeat`.

## Design

Interface concept and rationale (TRIZ principles, semantic zoom, why-chains) are documented in the in-app `?` popover and [PRODUCT.md](../PRODUCT.md).

# Atlas as Paperclip's org view — core-UI integration

This folder makes Atlas the `/org` route of the actual Paperclip app
(github.com/paperclipai/paperclip). It was built and verified against a live
dev instance: the map renders the real company from the same react-query
endpoints the rest of the board uses, and map gestures round-trip to the API
(drag-to-re-org was verified to persist `reportsTo` in the database).

## Files

- `OrgAtlas.tsx` — the page component. Data in: `agentsApi.list` (budgets in
  cents, `reportsTo`, statuses), `issuesApi.list` (task hierarchy + assignees),
  `goalsApi.list` (mission title), company spend/budget from `CompanyContext`.
  Actions out: re-org and budget → `agentsApi.update`, pause/resume →
  `agentsApi.pause/resume`, beat → `agentsApi.wakeup`, fire →
  `agentsApi.remove`, hire → routes to `/agents/new`. Scalar changes stream
  onto the live map as animated deltas (5s poll); structural changes remount.
- `atlas.d.ts` — TypeScript surface for the engine.
- `App.tsx.patch` — the route change: `/org` → Atlas, `/org/classic` → the
  original OrgChart.

## Apply to a Paperclip checkout

```bash
./apply.sh /path/to/paperclip     # or the manual steps below
```

Manual:

```bash
P=/path/to/paperclip
mkdir -p $P/ui/src/lib/pc-atlas
cp ../src/atlas.js atlas.d.ts $P/ui/src/lib/pc-atlas/
cp OrgAtlas.tsx $P/ui/src/pages/
git -C $P apply App.tsx.patch
```

Then `pnpm dev` and open `/{ISSUE_PREFIX}/org`.

## Notes

- The engine is the same `atlas/src/atlas.js` used standalone and by the
  plugin package; the root node's metric is configured here as
  "spent / mo" vs the company monthly budget (`metricLabel` / `metricScale`).
- Agents with status `terminated` are hidden; `error` renders as stopped
  (red), `paused`/`pending_approval` as paused.
- Issue statuses map: `done` → done, `in_review` → review, `blocked` →
  blocked, `cancelled` → hidden, everything else → active.
- Dev gotcha seen in testing: a previously installed production Paperclip
  registers a service worker on `localhost:<port>`; if you see a stale UI,
  unregister it (DevTools → Application → Service workers) or use a port your
  browser hasn't seen before.

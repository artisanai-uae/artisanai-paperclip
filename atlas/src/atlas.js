/*
 * Paperclip Atlas — embeddable org-mindmap command surface.
 * Zero dependencies. Mount into any element:
 *
 *   import { mountAtlas } from './atlas.js';
 *   const atlas = mountAtlas(el, { model, simulate: false, onAction: a => { ... } });
 *
 * model: {
 *   company: { name, goal, mrr?, mrrTarget?, revenueRate? },
 *   agents:  [{ id, name, role, parentId?, adapter?, budget?, spent?, beatEvery?, status?, glyph?, revenue? }],
 *   tasks:   [{ id, title, ownerId, parentId?, status?, progress? }],
 * }
 * onAction receives user intents: reorg | hire | fire | pause | resume | beat | budget.
 * applyEvent pushes live host updates in: beat | agent | task | taskDone | company | feed.
 */

const ATLAS_CSS = String.raw`
/* ================================================================
   PAPERCLIP ATLAS — pre-dawn flight deck
   Dark is operational: an ambient-light control room for a company
   that never sleeps. Signals are luminous; surface stays quiet.
   ================================================================ */

@property --pca-pct     { syntax: '<number>'; inherits: true; initial-value: 0; }
@property --pca-beatglo { syntax: '<number>'; inherits: false; initial-value: 0; }

.pc-atlas {
  --bg:        oklch(0.145 0.030 262);
  --bg-deep:   oklch(0.115 0.026 262);
  --surface:   oklch(0.195 0.036 262);
  --surface-2: oklch(0.235 0.040 262);
  --line:      oklch(0.32 0.05 262);
  --ink:       oklch(0.935 0.010 250);
  --ink-2:     oklch(0.760 0.030 255);
  --ink-3:     oklch(0.620 0.035 258);

  --cobalt:    oklch(0.55 0.210 261);
  --cobalt-hi: oklch(0.68 0.180 261);
  --cyan:      oklch(0.80 0.140 210);
  --ok:        oklch(0.76 0.170 155);
  --warn:      oklch(0.80 0.150 80);
  --danger:    oklch(0.68 0.210 25);
  --paused:    oklch(0.55 0.020 260);

  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace;
  --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;

  --r-node: 34px;          /* mid-LOD agent radius */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

  --z-hud: 10; --z-panel: 20; --z-bar: 30; --z-pop: 40; --z-toast: 50;
}

.pc-atlas, .pc-atlas *, .pc-atlas *::before, .pc-atlas *::after { box-sizing: border-box; margin: 0; }
.pc-atlas {
  position: relative; overflow: hidden; width: 100%; height: 100%;
  container-type: size;
  background:
    radial-gradient(1200px 800px at 50% 42%, oklch(0.185 0.040 262 / .9), transparent 65%),
    var(--bg-deep);
  color: var(--ink);
  font: 14px/1.45 var(--sans);
  -webkit-font-smoothing: antialiased;
}

/* faint star-chart grid — instrument backdrop, not decoration:
   it gives pan/zoom motion a reference frame */
.pc-atlas #stage {
  position: absolute; inset: 0; cursor: grab; touch-action: none;
  background-image:
    radial-gradient(oklch(0.30 0.05 262 / .35) 1px, transparent 1.5px);
  background-size: 34px 34px;
}
.pc-atlas #stage.panning { cursor: grabbing; }

.pc-atlas #world { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-origin: 0 0; will-change: transform; }

.pc-atlas svg#wires { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; }

.pc-atlas path.edge {
  fill: none;
  vector-effect: non-scaling-stroke;   /* wires stay crisp at every zoom */
  stroke: color-mix(in oklch, var(--cobalt) 55%, transparent);
  stroke-width: 1.6;
  transition: stroke .3s, opacity .3s;
}
.pc-atlas path.edge.hov { stroke: color-mix(in oklch, var(--cobalt-hi) 88%, transparent); stroke-width: 2.4; }
.pc-atlas path.edge.hidden { opacity: 0; pointer-events: none; }
.pc-atlas path.edge.lit {
  stroke: var(--cyan);
  stroke-width: 2.4;
  stroke-dasharray: 7 9;
  animation: pca-flow 0.9s linear infinite;
  filter: drop-shadow(0 0 6px color-mix(in oklch, var(--cyan) 70%, transparent));
}
@keyframes pca-flow { to { stroke-dashoffset: -16; } }
.pc-atlas[data-lod="far"] path.edge { stroke: color-mix(in oklch, var(--cobalt) 78%, transparent); }

.pc-atlas circle.particle { pointer-events: none; }

/* ---------------- agent nodes ---------------- */
.pc-atlas .node {
  position: absolute; left: 0; top: 0;
  transform: translate(-50%, -50%);
  width: calc(var(--r-node) * 2); height: calc(var(--r-node) * 2);
  border-radius: 50%;
  cursor: pointer;
  outline: none;
  user-select: none; -webkit-user-select: none;
}
.pc-atlas .node:focus-visible .core { box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--cyan); }

/* budget annulus — conic arc IS the budget meter (state, not chrome) */
.pc-atlas .meter {
  position: absolute; inset: -6px; border-radius: 50%;
  background: conic-gradient(from -90deg,
      var(--meter-c, var(--ok)) calc(var(--pca-pct) * 1turn),
      oklch(0.30 0.04 262 / .55) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4.5px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 5px), #000 calc(100% - 4.5px));
  transition: --pca-pct .8s var(--ease-out);
}

.pc-atlas .core {
  position: absolute; inset: 0; border-radius: 50%;
  display: grid; place-items: center;
  background:
    radial-gradient(circle at 32% 28%, color-mix(in oklch, var(--status-c) 26%, var(--surface)), var(--surface) 68%);
  border: 1px solid color-mix(in oklch, var(--status-c) 55%, var(--line));
  box-shadow:
    0 0 calc(var(--pca-beatglo) * 22px) color-mix(in oklch, var(--status-c) 60%, transparent),
    0 2px 14px oklch(0 0 0 / .45);
  transition: border-color .3s;
}
.pc-atlas .glyph { font-size: 22px; line-height: 1; filter: saturate(.9); }

/* status dot + pulse ring */
.pc-atlas .dot {
  position: absolute; right: 1px; top: 1px; width: 11px; height: 11px;
  border-radius: 50%; background: var(--status-c);
  border: 2px solid var(--bg);
}
.pc-atlas .pulse {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 2px solid var(--cyan);
  opacity: 0; pointer-events: none;
}

.pc-atlas .tag {
  position: absolute; top: calc(100% + 7px); left: 50%; transform: translateX(-50%);
  text-align: center; white-space: nowrap; pointer-events: none;
}
.pc-atlas .tag b  { display: block; font-size: 12.5px; font-weight: 600; letter-spacing: .01em; }
.pc-atlas .tag i  { display: block; font-style: normal; font-size: 10.5px; color: var(--ink-2); }

/* near-LOD extras (task line + spend readout) hidden until zoomed in */
.pc-atlas .near-info {
  position: absolute; top: calc(100% + 40px); left: 50%; transform: translateX(-50%);
  width: 172px; text-align: center; pointer-events: none;
  opacity: 0; transition: opacity .25s;
}
.pc-atlas .near-info .task { font-size: 10.5px; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pc-atlas .near-info .spend { font: 10px var(--mono); color: var(--ink-3); margin-top: 3px; }
.pc-atlas .near-info .boss  { font: 9.5px var(--mono); color: var(--ink-3); margin-bottom: 2px; }

/* -------- semantic zoom: representation changes with scale (LOD) --------
   .disc scales on the compositor (the 'scale' property, not width/height),
   so LOD morphs never touch layout */
.pc-atlas .disc { position: absolute; inset: 0; scale: 1; transition: scale .22s var(--ease-out); }
.pc-atlas .tag  { translate: 0 0; scale: 1; transform-origin: top center; transition: translate .22s var(--ease-out), scale .22s var(--ease-out); }
/* --invz = 1/zoom (set by the camera): at far LOD dots and labels counter-scale
   to constant screen size, so the constellation stays readable from orbit */
.pc-atlas[data-lod="far"] .node:not(.root) .disc { scale: calc(0.34 * var(--invz, 1)); }
.pc-atlas[data-lod="far"] .node:not(.root) .tag  { top: 50%; translate: 0 calc(14px * var(--invz, 1)); scale: var(--invz, 1); }
.pc-atlas[data-lod="far"] .node.root { scale: calc(0.62 * var(--invz, 1)); transition: scale .22s var(--ease-out); }
.pc-atlas[data-lod="far"] .node:not(.root) .glyph,
.pc-atlas[data-lod="far"] .node:not(.root) .meter,
.pc-atlas[data-lod="far"] .node:not(.root) .tag i,
.pc-atlas[data-lod="far"] .near-info { opacity: 0; }
.pc-atlas[data-lod="far"] .node:not(.root) .tag b { font-size: 11px; }
.pc-atlas[data-lod="near"] .near-info { opacity: 1; }

.pc-atlas .node .glyph, .node .meter, .node .tag i { transition: opacity .25s; }

.pc-atlas .node.selected .core {
  border-color: var(--cyan);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--cyan) 55%, transparent), 0 2px 18px oklch(0 0 0 / .5);
}
.pc-atlas .node.dim { opacity: .28; transition: opacity .3s; }

/* ---------------- mission (root) node ---------------- */
.pc-atlas .node.root { --r-node: 78px; cursor: pointer; }
.pc-atlas .node.root .core {
  background:
    radial-gradient(circle at 35% 28%, oklch(0.30 0.09 261), oklch(0.205 0.055 261) 70%);
  border-color: color-mix(in oklch, var(--cobalt-hi) 60%, var(--line));
}
.pc-atlas .node.root .meter { inset: -9px; --meter-c: var(--cobalt-hi); }
.pc-atlas .mission { text-align: center; padding: 0 14px; }
.pc-atlas .mission .co  { font-size: 15px; font-weight: 700; letter-spacing: .01em; }
.pc-atlas .mission .goal{ font-size: 10px; color: var(--ink-2); margin-top: 3px; max-width: 130px; }
.pc-atlas .mission .mrr { font: 600 12px var(--mono); color: var(--cyan); margin-top: 5px; }

/* ---------- fold badge: the mindmap collapse gesture ---------- */
.pc-atlas .badge {
  position: absolute; top: calc(100% - 8px); left: 50%; translate: -50% 0;
  min-width: 26px; height: 16px; padding: 0 6px;
  display: none; align-items: center; justify-content: center;
  font: 600 9.5px var(--mono); color: var(--ink-2);
  background: var(--surface-2); border: 1px solid var(--line); border-radius: 99px;
  cursor: pointer; z-index: 2;
}
.pc-atlas .node.has-reports .badge { display: inline-flex; }
.pc-atlas .badge:hover { color: var(--ink); border-color: var(--cobalt-hi); }
.pc-atlas .node.folded .badge { color: var(--cyan); border-color: color-mix(in oklch, var(--cyan) 45%, var(--line)); }
.pc-atlas[data-lod="far"] .badge { display: none !important; }

.pc-atlas .node { transition: opacity .3s; }
.pc-atlas .node.hidden { opacity: 0; pointer-events: none; }

/* drag re-org: the orgchart gesture */
.pc-atlas .node.dragging .core { border-color: var(--cobalt-hi); }
.pc-atlas .node.droptarget .core {
  border-color: var(--cyan);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--cyan) 45%, transparent),
              0 0 26px color-mix(in oklch, var(--cyan) 40%, transparent);
}

/* selection halo: quick actions live on the node itself */
.pc-atlas #halo {
  position: absolute; z-index: var(--z-hud); translate: -50% -100%;
  display: flex; gap: 4px; padding: 4px;
  background: color-mix(in oklch, var(--surface) 94%, transparent);
  border: 1px solid var(--line); border-radius: 99px;
  box-shadow: 0 8px 24px oklch(0 0 0 / .45);
}
.pc-atlas #halo[hidden] { display: none; }
.pc-atlas #halo button {
  all: unset; width: 27px; height: 27px; border-radius: 50%;
  display: grid; place-items: center; font-size: 12.5px; cursor: pointer; color: var(--ink-2);
}
.pc-atlas #halo button:hover { background: var(--surface-2); color: var(--ink); }
.pc-atlas #halo button:focus-visible { outline: 2px solid var(--cyan); }

/* live activity feed: the "what is going on" narration */
.pc-atlas #feed {
  position: absolute; left: 16px; bottom: 18px; z-index: var(--z-hud);
  display: flex; flex-direction: column; gap: 4px;
  width: 300px; pointer-events: none;
}
.pc-atlas #feed .ev {
  pointer-events: auto; cursor: pointer;
  display: flex; gap: 8px; align-items: baseline;
  font-size: 11.5px; color: var(--ink-2);
  background: color-mix(in oklch, var(--surface) 84%, transparent);
  border: 1px solid color-mix(in oklch, var(--line) 70%, transparent);
  border-radius: 8px; padding: 5px 9px;
}
.pc-atlas #feed .ev:hover { color: var(--ink); border-color: var(--line); }
.pc-atlas #feed .ev .ic { flex: none; font-family: var(--mono); color: var(--cyan); }
.pc-atlas #feed .ev b { color: var(--ink); font-weight: 600; }
.pc-atlas #feed .ev:nth-last-child(4) { opacity: .65; }
.pc-atlas #feed .ev:nth-last-child(5) { opacity: .4; }
.pc-atlas #feed .ev:nth-last-child(n+6) { opacity: .2; }
@container (max-width: 900px) { #feed { display: none; } }

/* legend: decode the instruments at a glance */
.pc-atlas #legend {
  position: absolute; right: 16px; bottom: 18px; z-index: var(--z-hud);
  display: flex; gap: 11px; align-items: center;
  font-size: 10px; color: var(--ink-2);
  background: color-mix(in oklch, var(--surface) 84%, transparent);
  border: 1px solid color-mix(in oklch, var(--line) 70%, transparent);
  border-radius: 8px; padding: 5px 10px;
}
.pc-atlas #legend i { font-style: normal; display: flex; gap: 4px; align-items: center; }
.pc-atlas #legend .sw { width: 8px; height: 8px; border-radius: 50%; }
@container (max-width: 900px) { #legend { display: none; } }

/* ================= HUD ================= */
.pc-atlas #hud {
  position: absolute; top: 14px; left: 16px; z-index: var(--z-hud);
  display: flex; align-items: center; gap: 18px;
}
.pc-atlas #brand { display: flex; align-items: center; gap: 9px; }
.pc-atlas #brand svg { display: block; }
.pc-atlas #brand b { font-size: 14px; font-weight: 700; letter-spacing: .015em; }
.pc-atlas #brand span { font-size: 11px; color: var(--ink-3); }

.pc-atlas #kpis { display: flex; gap: 14px; padding: 7px 14px; border-radius: 10px;
  background: color-mix(in oklch, var(--surface) 94%, transparent);
  border: 1px solid var(--line); }
.pc-atlas .kpi { min-width: 74px; }
.pc-atlas .kpi label { display: block; font-size: 9.5px; color: var(--ink-3); }
.pc-atlas .kpi output { font: 600 13px var(--mono); color: var(--ink); }
.pc-atlas .kpi output.good { color: var(--ok); }
.pc-atlas .kpi output.hot  { color: var(--warn); }

.pc-atlas #topright { position: absolute; top: 14px; right: 16px; z-index: var(--z-hud); display: flex; gap: 8px; }

/* shared control vocabulary */
.pc-atlas .btn {
  font: 500 12px var(--sans); color: var(--ink);
  background: var(--surface); border: 1px solid var(--line); border-radius: 8px;
  padding: 7px 11px; cursor: pointer;
  transition: background .15s, border-color .15s;
}
.pc-atlas .btn:hover { background: var(--surface-2); border-color: color-mix(in oklch, var(--cobalt-hi) 45%, var(--line)); }
.pc-atlas .btn:focus-visible { outline: 2px solid var(--cyan); outline-offset: 1px; }
.pc-atlas .btn:active { background: color-mix(in oklch, var(--cobalt) 22%, var(--surface)); }
.pc-atlas .btn[disabled] { opacity: .45; cursor: default; }
.pc-atlas .btn.primary { background: var(--cobalt); border-color: transparent; color: oklch(0.97 0.01 250); }
.pc-atlas .btn.primary:hover { background: var(--cobalt-hi); }
.pc-atlas .btn.danger:hover { border-color: var(--danger); color: var(--danger); }

/* ================= dossier panel ================= */
.pc-atlas #panel {
  position: absolute; top: 64px; right: 16px; bottom: 78px; width: 330px;
  z-index: var(--z-panel);
  background: color-mix(in oklch, var(--surface) 94%, transparent);
  border: 1px solid var(--line); border-radius: 14px;
  display: flex; flex-direction: column;
  transform: translateX(calc(100% + 24px));
  transition: transform .35s var(--ease-out);
  box-shadow: -8px 0 40px oklch(0 0 0 / .35);
}
.pc-atlas #panel.open { transform: none; }
.pc-atlas #panel header {
  display: flex; align-items: center; gap: 11px;
  padding: 14px 16px 12px; border-bottom: 1px solid var(--line);
}
.pc-atlas #panel header .pglyph {
  width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center;
  font-size: 21px; background: var(--surface-2); border: 1px solid var(--line);
}
.pc-atlas #panel header h2 { font-size: 15px; }
.pc-atlas #panel header .sub { font-size: 11px; color: var(--ink-2); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.pc-atlas .chip {
  font: 500 9.5px var(--mono); padding: 1.5px 7px; border-radius: 99px;
  border: 1px solid var(--line); color: var(--ink-2); background: var(--bg);
}
.pc-atlas .chip.status { border-color: color-mix(in oklch, var(--status-c) 60%, transparent); color: var(--status-c); }
.pc-atlas #panel header .x { margin-left: auto; }

.pc-atlas #panel .body { flex: 1; overflow-y: auto; padding: 14px 16px; scrollbar-width: thin; }

.pc-atlas .telem { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; margin-bottom: 14px; }
.pc-atlas .telem div label { display: block; font-size: 9.5px; color: var(--ink-3); }
.pc-atlas .telem div output { font: 600 12.5px var(--mono); }

.pc-atlas .section-h { font-size: 11px; font-weight: 600; color: var(--ink-2); margin: 16px 0 8px; display: flex; justify-content: space-between; align-items: center; }

.pc-atlas .budget-row { display: flex; align-items: center; gap: 10px; }
.pc-atlas .budget-row input[type=range] { flex: 1; accent-color: var(--cobalt-hi); }
.pc-atlas .budget-row output { font: 600 12px var(--mono); min-width: 58px; text-align: right; }

.pc-atlas ul.tasks { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.pc-atlas ul.tasks li {
  display: flex; gap: 9px; align-items: baseline;
  padding: 7px 9px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent;
  font-size: 12px;
}
.pc-atlas ul.tasks li:hover { background: var(--surface-2); }
.pc-atlas ul.tasks li.on { border-color: color-mix(in oklch, var(--cyan) 50%, transparent); background: color-mix(in oklch, var(--cyan) 9%, var(--surface)); }
.pc-atlas ul.tasks li .tdot { flex: none; width: 8px; height: 8px; border-radius: 50%; align-self: center; }
.pc-atlas ul.tasks li .tst { margin-left: auto; font: 10px var(--mono); color: var(--ink-3); flex: none; }

/* the why-chain — Paperclip's soul, rendered */
.pc-atlas #whychain { margin-top: 10px; padding: 11px 12px; border-radius: 10px;
  background: var(--bg); border: 1px solid color-mix(in oklch, var(--cyan) 30%, var(--line)); }
.pc-atlas #whychain .wc-row { display: flex; gap: 9px; font-size: 11.5px; padding: 3px 0; }
.pc-atlas #whychain .wc-row .arr { color: var(--cyan); font-family: var(--mono); flex: none; }
.pc-atlas #whychain .wc-row.goal b { color: var(--cobalt-hi); }
.pc-atlas #whychain .wc-who { color: var(--ink-3); font-size: 10px; }

.pc-atlas .actions { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--line); }

/* ================= command bar ================= */
.pc-atlas #cmdbar {
  position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%);
  z-index: var(--z-bar);
  display: flex; align-items: center; gap: 8px;
  background: color-mix(in oklch, var(--surface) 92%, transparent);
  border: 1px solid var(--line); border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 10px 34px oklch(0 0 0 / .45);
}
.pc-atlas #cmdbar input {
  width: 240px; background: var(--bg); color: var(--ink);
  border: 1px solid var(--line); border-radius: 8px;
  font: 13px var(--sans); padding: 7px 10px;
}
.pc-atlas #cmdbar input::placeholder { color: var(--ink-3); }
.pc-atlas #cmdbar input:focus { outline: 2px solid var(--cobalt-hi); outline-offset: -1px; }
.pc-atlas #cmdbar kbd {
  font: 10.5px var(--mono); color: var(--ink-2);
  border: 1px solid var(--line); border-bottom-width: 2px; border-radius: 5px;
  padding: 1px 5px; background: var(--surface-2);
}
.pc-atlas #results {
  position: absolute; bottom: calc(100% + 8px); left: 10px; width: 260px;
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 5px; display: none; flex-direction: column;
  box-shadow: 0 12px 30px oklch(0 0 0 / .5);
}
.pc-atlas #results.show { display: flex; }
.pc-atlas #results button {
  all: unset; display: flex; gap: 9px; align-items: center;
  padding: 7px 9px; border-radius: 7px; font-size: 12.5px; cursor: pointer;
}
.pc-atlas #results button:hover, #results button.hot { background: color-mix(in oklch, var(--cobalt) 26%, var(--surface)); }
.pc-atlas #results button .rrole { color: var(--ink-3); font-size: 10.5px; margin-left: auto; }

/* ================= popovers / toast ================= */
.pc-atlas [popover] {
  position: fixed; inset: 0; margin: auto; height: fit-content;
  z-index: var(--z-pop);
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--line); border-radius: 14px;
  padding: 20px 22px; width: min(430px, 90vw);
  box-shadow: 0 24px 70px oklch(0 0 0 / .55);
}
.pc-atlas [popover]::backdrop { background: oklch(0.08 0.02 262 / .55); backdrop-filter: blur(2px); }
.pc-atlas #about h3 { font-size: 15px; margin-bottom: 4px; }
.pc-atlas #about .lede { font-size: 12px; color: var(--ink-2); margin-bottom: 14px; }
.pc-atlas #about dl { display: grid; grid-template-columns: auto 1fr; gap: 7px 12px; font-size: 12px; }
.pc-atlas #about dt { font: 600 10.5px var(--mono); color: var(--cyan); white-space: nowrap; padding-top: 1px; }
.pc-atlas #about dd { color: var(--ink-2); }
.pc-atlas #about dd b { color: var(--ink); font-weight: 600; }

.pc-atlas #toast {
  position: absolute; left: 50%; top: 66px; transform: translateX(-50%);
  z-index: var(--z-toast);
  background: var(--surface); border: 1px solid var(--line); border-radius: 10px;
  padding: 9px 16px; font-size: 12.5px; color: var(--ink-2);
  opacity: 0; translate: 0 -6px; transition: opacity .3s, translate .3s;
  pointer-events: none;
}
.pc-atlas #toast.show { opacity: 1; translate: 0 0; }
.pc-atlas #toast b { color: var(--ink); }

/* hire dialog */
.pc-atlas dialog {
  background: var(--surface); color: var(--ink);
  border: 1px solid var(--line); border-radius: 14px; padding: 20px;
  width: min(340px, 90vw);
  box-shadow: 0 24px 70px oklch(0 0 0 / .6);
}
.pc-atlas dialog::backdrop { background: oklch(0.08 0.02 262 / .55); }
.pc-atlas dialog h3 { font-size: 14px; margin-bottom: 12px; }
.pc-atlas dialog label { display: block; font-size: 11px; color: var(--ink-2); margin: 10px 0 4px; }
.pc-atlas dialog input, dialog select {
  width: 100%; background: var(--bg); color: var(--ink);
  border: 1px solid var(--line); border-radius: 8px; padding: 7px 9px; font: 13px var(--sans);
}
.pc-atlas dialog .drow { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

/* ================= responsive ================= */
@container (max-width: 760px) {
  .pc-atlas #panel { left: 10px; right: 10px; width: auto; top: auto; height: 44vh; bottom: 84px; }
  .pc-atlas #kpis { display: none; }
  .pc-atlas #cmdbar input { width: 140px; }
  .pc-atlas #cmdbar kbd { display: none; }
}

/* ================= reduced motion: state stays, choreography goes ===== */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition-duration: .01ms !important; }
  .pc-atlas path.edge.lit { stroke-dasharray: none; }
}
`;

let stylesInjected = false;
function ensureStyles(doc) {
  if (stylesInjected && doc.querySelector('style[data-pc-atlas]')) return;
  const st = doc.createElement('style');
  st.setAttribute('data-pc-atlas', '');
  st.textContent = ATLAS_CSS;
  doc.head.appendChild(st);
  stylesInjected = true;
}

const SCAFFOLD = String.raw`
<div id="stage" aria-label="Company org map. Scroll to zoom, drag to pan.">
  <div id="world">
    <svg id="wires" width="1" height="1"></svg>
    <div id="nodes"></div>
  </div>
</div>

<div id="hud">
  <div id="brand" title="Paperclip Atlas">
    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <path d="M18.5 7.5v8a5.5 5.5 0 0 1-11 0v-9a3.8 3.8 0 1 1 7.6 0v8.6a2.1 2.1 0 1 1-4.2 0V8" stroke="oklch(0.68 0.18 261)" stroke-width="2" stroke-linecap="round"/>
    </svg>
    <div><b>Paperclip Atlas</b><br><span id="coName">NoteWiz, Inc.</span></div>
  </div>
  <div id="kpis" role="status" aria-label="Company vitals">
    <div class="kpi"><label>MRR</label><output id="kMrr" class="good">$0</output></div>
    <div class="kpi"><label>Burn / mo</label><output id="kBurn">$0</output></div>
    <div class="kpi"><label>Agents live</label><output id="kLive">0</output></div>
    <div class="kpi"><label>Tasks in flight</label><output id="kTasks">0</output></div>
    <div class="kpi"><label>Heartbeats / min</label><output id="kBeats">0</output></div>
  </div>
</div>

<div id="topright">
  <button class="btn" id="layoutBtn" title="Switch between hierarchy and constellation layout"></button>
  <button class="btn" id="fitBtn" title="Fit map (0)">⌖ Fit</button>
  <button class="btn" id="simBtn" title="Pause simulation">❚❚ Sim</button>
  <button class="btn" popovertarget="about" title="How this interface thinks">?</button>
</div>

<aside id="panel" aria-label="Agent dossier">
  <header>
    <div class="pglyph" id="pGlyph">🤖</div>
    <div>
      <h2 id="pName">—</h2>
      <div class="sub"><span id="pRole">—</span><span class="chip" id="pAdapter">—</span><span class="chip status" id="pStatus">—</span></div>
    </div>
    <button class="btn x" id="pClose" aria-label="Close panel">✕</button>
  </header>
  <div class="body">
    <div class="telem">
      <div><label>Heartbeat</label><output id="pBeat">—</output></div>
      <div><label>Last beat</label><output id="pLast">—</output></div>
      <div><label>Spend this month</label><output id="pSpend">—</output></div>
      <div><label>Reports</label><output id="pReports">—</output></div>
    </div>

    <div class="section-h">Monthly budget <output id="pBudgetOut" style="font-family:var(--mono)">—</output></div>
    <div class="budget-row">
      <input type="range" id="pBudget" min="50" max="3000" step="25" aria-label="Monthly budget">
    </div>

    <div class="section-h">Tasks <span style="font-weight:400;color:var(--ink-3);font-size:10px">click one to trace its why-chain</span></div>
    <ul class="tasks" id="pTasks"></ul>

    <div id="whychain" hidden></div>
  </div>
  <div class="actions">
    <button class="btn primary" id="aBeat">⚡ Beat now</button>
    <button class="btn" id="aPause">❚❚ Pause</button>
    <button class="btn" id="aHire">＋ Hire report</button>
    <button class="btn danger" id="aFire">Fire</button>
  </div>
</aside>

<div id="cmdbar">
  <input id="cmdInput" type="text" placeholder="Jump to agent…" autocomplete="off" aria-label="Search agents">
  <div id="results" role="listbox"></div>
  <kbd>/</kbd>
  <span style="width:1px;height:20px;background:var(--line)"></span>
  <button class="btn" id="pauseAll" title="Pause every agent">❚❚ All</button>
  <button class="btn" id="runAll" title="Resume every agent">▶ All</button>
</div>

<div id="about" popover>
  <h3>A map you manage, not a chart you read</h3>
  <p class="lede">Paperclip runs autonomous AI companies. Atlas turns its whole control plane (org, heartbeats, budgets, task lineage) into one living surface, shaped by TRIZ inventive principles:</p>
  <dl>
    <dt>#7 Nested doll</dt><dd><b>Semantic zoom.</b> Zoom out: agents are constellation dots. Zoom in: rings, then working dossiers. Representation changes, not just size.</dd>
    <dt>#3 Local quality</dt><dd><b>Every node carries its own instruments:</b> the conic arc is its budget, the pulse is its heartbeat, the dot is its status.</dd>
    <dt>#15 Dynamics</dt><dd><b>The map is alive.</b> Delegation particles flow down edges; results flow back up. Nothing moves without meaning.</dd>
    <dt>#24 Intermediary</dt><dd><b>Edges are conduits</b>, not lines: work, money and alignment travel through them.</dd>
    <dt>#10 Prior action</dt><dd><b>Budget governance is pre-armed:</b> an agent that exhausts its budget stops itself before costs run away.</dd>
    <dt>#32 Color change</dt><dd><b>State is temperature:</b> cyan = alive, green = funded, amber = near limit, red = stopped.</dd>
    <dt>#17 Another dimension</dt><dd><b>Two projections, one org:</b> Hierarchy view ranks agents in labeled tiers (Mission, CEO, Leadership, Team); Constellation view shows the same company as a radial map. Toggle anytime.</dd>
  </dl>
  <p style="margin-top:14px;font-size:11px;color:var(--ink-3)">Scroll to zoom · drag the canvas to pan · click an agent for its dossier · <b>drag an agent onto a new manager to re-org</b> · double-click (or its ▾ badge) to fold a branch · <kbd style="font:10px var(--mono);border:1px solid var(--line);border-radius:4px;padding:0 4px">/</kbd> to search · click a task to light its why-chain to the mission.</p>
</div>

<dialog id="hireDlg">
  <h3>Hire a report</h3>
  <form method="dialog" id="hireForm">
    <label for="hName">Name</label>
    <input id="hName" required maxlength="18" placeholder="e.g. Nova">
    <label for="hRole">Role</label>
    <input id="hRole" required maxlength="26" placeholder="e.g. Growth Engineer">
    <label for="hAdapter">Adapter</label>
    <select id="hAdapter">
      <option>Claude Code</option><option>OpenClaw</option><option>Codex</option>
      <option>Cursor</option><option>Script</option><option>HTTP</option>
    </select>
    <div class="drow">
      <button class="btn" value="cancel" formnovalidate>Cancel</button>
      <button class="btn primary" value="ok" id="hireOk">Hire</button>
    </div>
  </form>
</dialog>

<div id="toast" role="status"></div>

<div id="legend" aria-hidden="true">
  <i><span class="sw" style="background:var(--cyan)"></span>alive</i>
  <i><span class="sw" style="background:var(--warn)"></span>near limit</i>
  <i><span class="sw" style="background:var(--danger)"></span>stopped</i>
  <i><span class="sw" style="background:var(--paused)"></span>paused</i>
  <i>ring = budget spent</i>
</div>
`;

export function mountAtlas(rootEl, opts = {}) {
  ensureStyles(rootEl.ownerDocument);
  rootEl.classList.add('pc-atlas');
  rootEl.dataset.lod = 'mid';
  rootEl.innerHTML = SCAFFOLD;

  const VW = () => rootEl.clientWidth || 800;
  const VH = () => rootEl.clientHeight || 600;
  let _rect = null;
  const refreshRect = () => { _rect = rootEl.getBoundingClientRect(); };
  const LX = e => { if (!_rect) refreshRect(); return e.clientX - _rect.left; };
  const LY = e => { if (!_rect) refreshRect(); return e.clientY - _rect.top; };
  const storGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const storSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
  const _cleanups = [];
  const docOn = (target, ev, fn, o) => { target.addEventListener(ev, fn, o); _cleanups.push(() => target.removeEventListener(ev, fn, o)); };
  const emit = action => { try { opts.onAction?.(action); } catch (err) { console.error('[atlas] onAction handler failed', err); } };


/* ================================================================
   DATA — a Paperclip company (the README's own dream scenario)
   ================================================================ */
const fmt$ = n => '$' + Math.round(n).toLocaleString('en-US');
const GLYPHS = { ceo:'\u{1F451}', cto:'\u{1F6E0}\uFE0F', cmo:'\u{1F4E3}', cfo:'\u{1F4D2}', eng:'\u2699\uFE0F', design:'\u{1F3A8}', content:'\u270D\uFE0F', ads:'\u{1F3AF}', qa:'\u{1F9EA}', generic:'\u{1F916}' };
function glyphFor(role = '') {
  const r = role.toLowerCase();
  if (/ceo|chief exec|founder/.test(r)) return GLYPHS.ceo;
  if (/cto|vp eng|head of eng/.test(r)) return GLYPHS.cto;
  if (/cmo|marketing/.test(r)) return GLYPHS.cmo;
  if (/cfo|finance|ops/.test(r)) return GLYPHS.cfo;
  if (/design/.test(r)) return GLYPHS.design;
  if (/content|writer|docs/.test(r)) return GLYPHS.content;
  if (/ads|growth|acquisition/.test(r)) return GLYPHS.ads;
  if (/qa|test/.test(r)) return GLYPHS.qa;
  if (/engineer|developer|backend|frontend/.test(r)) return GLYPHS.eng;
  return GLYPHS.generic;
}

/* ---- model ingestion: host data in, engine objects out ---- */
const model = opts.model || { company: {}, agents: [], tasks: [] };
const company = {
  name: model.company?.name || 'Untitled Company',
  goal: model.company?.goal || 'Set a company goal',
  mrr: model.company?.mrr ?? 0,
  mrrTarget: model.company?.mrrTarget || 1_000_000,
  revenueRate: model.company?.revenueRate || 0,
  metricLabel: model.company?.metricLabel || 'MRR',
  metricScale: model.company?.metricScale ?? 20,
};

let UID = 0;
function agent(o) {
  const a = Object.assign({
    children: [], status: 'running',
    spent: 0, lastBeat: 0, beatEvery: 20, phase: Math.random() * 20,
    x: 0, y: 0, tx: 0, ty: 0, tasks: [],
  }, o);
  if (!a.id) a.id = 'local-' + (++UID);
  if (!a.glyph) a.glyph = glyphFor(a.role);
  return a;
}

const root = agent({ id: '__root', name: company.name, role: 'Mission', glyph: '\u{1F4CE}', budget: 0, adapter: '\u2014' });
const byId = new Map([['__root', root]]);
for (const m of model.agents || []) {
  byId.set(m.id, agent({ adapter: 'Agent', budget: 300, ...m }));
}
for (const m of model.agents || []) {
  const a = byId.get(m.id);
  link((m.parentId && byId.get(m.parentId)) || root, a);
}
function link(p, c) { c.parent = p; p.children.push(c); }
function isRevenue(a) { for (let p = a; p && p !== root; p = p.parent) if (p.revenue) return true; return false; }

/* hierarchical tasks: every one traces to the mission (the why-chain) */
let TID = 0;
function task(owner, title, parent, status = 'active') {
  const t = { id: 'local-t' + (++TID), owner, title, parent, status, progress: status === 'done' ? 1 : Math.random() * .5 };
  owner.tasks.push(t); return t;
}
const tGoal = { id: '__goal', owner: root, title: company.goal, parent: null, status: 'active', progress: 0 };
root.tasks.push(tGoal);
const taskById = new Map([['__goal', tGoal]]);
for (const t of model.tasks || []) {
  const owner = byId.get(t.ownerId) || root;
  const obj = { id: t.id || 'local-t' + (++TID), owner, title: t.title, parent: null,
    status: t.status || 'active', progress: t.progress ?? (t.status === 'done' ? 1 : 0.25) };
  owner.tasks.push(obj); taskById.set(obj.id, obj);
}
for (const t of model.tasks || []) {
  const obj = taskById.get(t.id); if (!obj) continue;
  obj.parent = (t.parentId && taskById.get(t.parentId)) || tGoal;
}

const agents = () => { const out=[]; (function walk(n){ out.push(n); n.children.forEach(walk); })(root); return out; };

/* ================================================================
   LAYOUT — radial tidy tree, angular share ∝ leaf count
   ================================================================ */
const RING = 240;
const visKids = n => n.collapsed ? [] : n.children;
function visible(a) { for (let p = a.parent; p; p = p.parent) if (p.collapsed) return false; return true; }
function descCount(n) { return n.children.reduce((s, c) => s + 1 + descCount(c), 0); }
function leaves(n) { const k = visKids(n); return k.length ? k.reduce((s,c)=>s+leaves(c),0) : 1; }
let layoutMode = storGet('pc-atlas-layout') || opts.layout || 'tree';
const SLOT = 185, VGAP = 255;   /* tree mode: leaf slot width, tier height */

function layout() {
  if (layoutMode === 'tree') layoutTree(); else layoutRadial();
  /* folded subtrees tuck into their manager (they tween in and fade) */
  for (const a of agents()) if (a !== root && !visible(a)) {
    let p = a.parent; while (!visible(p)) p = p.parent;
    a.tx = p.tx; a.ty = p.ty;
  }
  drawTiers();
}

/* org-chart principle: rank = vertical tier; siblings share a row.
   x from leaf slots (tidy tree), internal nodes centered over their team */
function layoutTree() {
  let cursor = 0;
  (function place(n, depth) {
    n.ty = depth * VGAP;
    const kids = visKids(n);
    if (!kids.length) { n.tx = cursor * SLOT; cursor += 1; return; }
    for (const c of kids) place(c, depth + 1);
    n.tx = (kids[0].tx + kids[kids.length - 1].tx) / 2;
  })(root, 0);
  const shift = root.tx;                       /* mission anchored at x = 0 */
  for (const a of agents()) if (visible(a)) a.tx -= shift;
}

function layoutRadial() {
  root.tx = 0; root.ty = 0;
  let a0 = -Math.PI / 2;
  (function place(n, from, to, depth) {
    const span = to - from, L = leaves(n);
    let cursor = from;
    for (const c of visKids(n)) {
      const share = span * leaves(c) / L;
      const ang = cursor + share / 2;
      const r = depth * RING * (depth > 1 ? 0.92 : 1);
      c.tx = Math.cos(ang) * r; c.ty = Math.sin(ang) * r;
      place(c, cursor, cursor + share, depth + 1);
      cursor += share;
    }
  })(root, a0, a0 + Math.PI * 2, 1);
}

/* tier bands: each level of the hierarchy names itself */
const TIER_NAMES = ['Mission', 'CEO', 'Leadership', 'Team'];
let tiersG = null;
function drawTiers() {
  if (!tiersG) { tiersG = document.createElementNS('http://www.w3.org/2000/svg', 'g'); }
  tiersG.innerHTML = '';
  wires.prepend(tiersG);
  if (layoutMode !== 'tree') return;
  const vis = agents().filter(visible);
  const depths = new Map();
  for (const a of vis) {
    let d = 0; for (let p = a.parent; p; p = p.parent) d++;
    depths.set(d, true);
  }
  const xs = vis.map(a => a.tx);
  const x0 = Math.min(...xs) - 230, x1 = Math.max(...xs) + 230;
  for (const d of [...depths.keys()].sort((a, b) => a - b)) {
    if (d === 0) continue;                    /* the mission node speaks for itself */
    const y = d * VGAP - 78;
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', x0); ln.setAttribute('x2', x1);
    ln.setAttribute('y1', y); ln.setAttribute('y2', y);
    ln.setAttribute('stroke', 'oklch(0.32 0.05 262 / .45)');
    ln.setAttribute('stroke-dasharray', '3 8');
    ln.setAttribute('vector-effect', 'non-scaling-stroke');
    tiersG.appendChild(ln);
    const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tx.setAttribute('x', x0); tx.setAttribute('y', y - 9);
    tx.setAttribute('fill', 'oklch(0.62 0.035 258)');
    tx.setAttribute('style', 'font: 600 12px ui-monospace, Menlo, monospace; letter-spacing: .06em;');
    tx.textContent = (TIER_NAMES[d] || 'Level ' + d).toUpperCase();
    tiersG.appendChild(tx);
  }
}

function toggleFold(a) {
  if (!a.children.length) return;
  a.collapsed = !a.collapsed;
  if (selected && selected !== a && !visible(selected)) deselect();
  layout(); startTween();
}
function unfoldTo(a) {
  let changed = false;
  for (let p = a.parent; p; p = p.parent) if (p.collapsed) { p.collapsed = false; changed = true; }
  if (changed) { layout(); startTween(); }
}

/* position tween (relayout animates; edges follow every frame) */
let tweenT = 1;
function startTween() { tweenT = 0; }
function stepTween(dt) {
  if (tweenT >= 1) return false;
  tweenT = Math.min(1, tweenT + dt / 0.65);
  const e = 1 - Math.pow(1 - tweenT, 4);           /* ease-out-quart */
  for (const a of agents()) { a.x += (a.tx - a.x) * (tweenT===1?1:0.18 + e*0.12); a.y += (a.ty - a.y) * (tweenT===1?1:0.18 + e*0.12); }
  if (tweenT === 1) for (const a of agents()) { a.x = a.tx; a.y = a.ty; }
  return true;
}

/* ================================================================
   DOM — nodes & wires
   ================================================================ */
const $ = s => rootEl.querySelector(s);
const world = $('#world'), wires = $('#wires'), nodesEl = $('#nodes'), stage = $('#stage');
const nodeEls = new Map(), edgeEls = new Map();

function statusColor(a) {
  if (a === root) return 'var(--cobalt-hi)';
  if (a.status === 'paused') return 'var(--paused)';
  if (a.status === 'stopped') return 'var(--danger)';
  const pct = a.spent / a.budget;
  return pct > 0.85 ? 'var(--warn)' : 'var(--cyan)';
}
function meterColor(a) {
  const pct = a.spent / a.budget;
  return a.status==='stopped' ? 'var(--danger)' : pct > 0.85 ? 'var(--warn)' : 'var(--ok)';
}

function buildNode(a) {
  const el = document.createElement('div');
  el.className = 'node' + (a === root ? ' root' : '');
  el.tabIndex = 0;
  el.setAttribute('role','button');
  el.dataset.id = a.id;
  if (a === root) {
    el.innerHTML = `<div class="meter"></div><div class="core"><div class="mission">
      <div class="co">${a.name}</div><div class="goal">${company.goal}</div>
      <div class="mrr" id="rootMrr"></div></div></div><span class="pulse"></span>
      <button class="badge" aria-label="Fold or unfold reports"></button>`;
  } else {
    el.innerHTML = `<div class="disc"><div class="meter"></div><div class="core"><span class="glyph">${a.glyph}</span></div>
      <span class="dot"></span><span class="pulse"></span></div>
      <div class="tag"><b>${a.name}</b><i>${a.role}</i></div>
      <button class="badge" aria-label="Fold or unfold reports"></button>
      <div class="near-info"><div class="boss"></div><div class="task"></div><div class="spend"></div></div>`;
  }
  el.querySelector('.badge').addEventListener('click', e => { e.stopPropagation(); toggleFold(a); });
  el.addEventListener('dblclick', e => { e.preventDefault(); toggleFold(a); });
  el.addEventListener('pointerdown', e => nodeDown(a, el, e));
  el.addEventListener('pointerenter', () => hoverBranch(a, true));
  el.addEventListener('pointerleave', () => hoverBranch(a, false));
  el.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); select(a); } });
  nodesEl.appendChild(el); nodeEls.set(a.id, el);
  return el;
}
function buildEdge(a) {
  const p = document.createElementNS('http://www.w3.org/2000/svg','path');
  p.classList.add('edge'); p.dataset.id = a.id;
  wires.prepend(p); edgeEls.set(a.id, p);
  return p;
}

function syncDom() {
  for (const a of agents()) {
    if (!nodeEls.has(a.id)) buildNode(a);
    if (a.parent && !edgeEls.has(a.id)) buildEdge(a);
  }
  for (const [id, el] of nodeEls) if (!agents().some(a=>a.id===id)) { el.remove(); nodeEls.delete(id); }
  for (const [id, el] of edgeEls) if (!agents().some(a=>a.id===id)) { el.remove(); edgeEls.delete(id); }
}

function edgePath(p, c) {
  if (layoutMode === 'tree') {
    /* leave below the parent's label block, arrive above the child: the
       reporting line never runs through a name */
    const y0 = p.y + (p === root ? 104 : 76), y1 = c.y - 46;
    const my = (y0 + y1) / 2;
    return `M ${p.x} ${y0} C ${p.x} ${my}, ${c.x} ${my}, ${c.x} ${y1} L ${c.x} ${c.y - 38}`;
  }
  /* radial: curve leaves the parent radially and eases into the child */
  const mx = p.x + (c.x - p.x) * 0.5, my = p.y + (c.y - p.y) * 0.5;
  return `M ${p.x} ${p.y} C ${p.x + (mx-p.x)*0.6} ${p.y + (my-p.y)*0.9}, ${mx} ${my}, ${c.x} ${c.y}`;
}

function render() {
  for (const a of agents()) {
    const el = nodeEls.get(a.id);
    el.style.transform = `translate(-50%,-50%) translate(${a.x}px, ${a.y}px)`;
    el.style.setProperty('--status-c', statusColor(a));
    el.classList.toggle('hidden', !visible(a));
    el.classList.toggle('has-reports', a.children.length > 0);
    el.classList.toggle('folded', !!a.collapsed);
    if (a.children.length) el.querySelector('.badge').textContent =
      a.collapsed ? `▸ ${descCount(a)}` : `▾ ${a.children.length}`;
    if (a !== root) {
      el.style.setProperty('--pca-pct', Math.min(1, a.spent / a.budget));
      el.style.setProperty('--meter-c', meterColor(a));
      const info = el.querySelector('.near-info');
      info.querySelector('.boss').textContent = '↑ reports to ' + (a.parent === root ? 'the board' : a.parent.name);
      const cur = a.tasks.find(t => t.status === 'active');
      info.querySelector('.task').textContent = a.status==='stopped' ? '■ stopped: budget exhausted'
        : a.status==='paused' ? '❚❚ paused' : (cur ? cur.title : 'idle, awaiting delegation');
      info.querySelector('.spend').textContent = `${fmt$(a.spent)} / ${fmt$(a.budget)} · ♥ ${a.beatEvery}s`;
    } else {
      el.style.setProperty('--pca-pct', Math.min(1, company.mrr / company.mrrTarget * company.metricScale));
      const m = el.querySelector('#rootMrr'); if (m) m.textContent = fmt$(company.mrr) + ' ' + company.metricLabel;
    }
    if (a.parent) { const eg = edgeEls.get(a.id); eg.setAttribute('d', edgePath(a.parent, a)); eg.classList.toggle('hidden', !visible(a)); }
  }
}

/* ================================================================
   CAMERA — pan / zoom / semantic LOD
   ================================================================ */
const cam = { x: VW()/2, y: VH()/2, z: 1 };
function applyCam() {
  world.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`;
  world.style.setProperty('--invz', (1 / cam.z).toFixed(4));
  rootEl.dataset.lod = cam.z < 0.55 ? 'far' : cam.z > 1.35 ? 'near' : 'mid';
}
stage.addEventListener('wheel', e => {
  e.preventDefault(); refreshRect();
  const f = Math.exp(-e.deltaY * 0.0016);
  const nz = Math.min(2.6, Math.max(0.22, cam.z * f));
  cam.x = LX(e) - (LX(e) - cam.x) * (nz / cam.z);
  cam.y = LY(e) - (LY(e) - cam.y) * (nz / cam.z);
  cam.z = nz; applyCam();
}, { passive: false });

let pan = null;
stage.addEventListener('pointerdown', e => {
  refreshRect();
  if (e.target.closest('.node')) return;
  pan = { x: LX(e), y: LY(e), cx: cam.x, cy: cam.y };
  stage.classList.add('panning'); stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!pan) return;
  cam.x = pan.cx + LX(e) - pan.x; cam.y = pan.cy + LY(e) - pan.y; applyCam();
});
stage.addEventListener('pointerup', () => { pan = null; stage.classList.remove('panning'); });
stage.addEventListener('click', e => { if (!e.target.closest('.node')) deselect(); });

function fit(animated = true) {
  const all = agents();
  const xs = all.map(a=>a.tx), ys = all.map(a=>a.ty);
  const w = Math.max(...xs) - Math.min(...xs) + 460, h = Math.max(...ys) - Math.min(...ys) + 420;
  const z = Math.min(1.4, Math.min(VW() / w, VH() / h));
  const target = { x: VW()/2 - (Math.max(...xs)+Math.min(...xs))/2 * z, y: VH()/2 - (Math.max(...ys)+Math.min(...ys))/2 * z, z };
  animateCam(target, animated ? 600 : 0);
}
function flyTo(a) {
  const z = Math.max(cam.z, 1.5);
  animateCam({ x: VW()/2 - a.tx*z - 90, y: VH()/2 - a.ty*z, z }, 650);
}
let camAnim = null;
function animateCam(to, ms) {
  if (!ms || matchMedia('(prefers-reduced-motion: reduce)').matches) { Object.assign(cam, to); applyCam(); return; }
  camAnim = { from: { ...cam }, to, t0: performance.now(), ms };
}
function stepCam(now) {
  if (!camAnim) return;
  let k = Math.min(1, (now - camAnim.t0) / camAnim.ms);
  k = 1 - Math.pow(1 - k, 4);
  cam.x = camAnim.from.x + (camAnim.to.x - camAnim.from.x) * k;
  cam.y = camAnim.from.y + (camAnim.to.y - camAnim.from.y) * k;
  cam.z = camAnim.from.z + (camAnim.to.z - camAnim.from.z) * k;
  applyCam();
  if (k === 1) camAnim = null;
}

/* ================================================================
   PARTICLES — delegation flows down, results flow up
   ================================================================ */
const particles = [];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
function spawnParticle(agentId, dir, color) {
  if (reduceMotion.matches) return;
  const path = edgeEls.get(agentId); if (!path) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
  c.setAttribute('r', dir === 1 ? 3 : 3.5); c.setAttribute('class','particle');
  c.setAttribute('fill', color);
  c.style.filter = `drop-shadow(0 0 4px ${color})`;
  wires.appendChild(c);
  particles.push({ el: c, path, t: dir === 1 ? 0 : 1, dir, speed: 0.55 + Math.random()*0.25 });
}
function stepParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += p.dir * p.speed * dt;
    if (p.t < 0 || p.t > 1 || !p.path.isConnected) { p.el.remove(); particles.splice(i,1); continue; }
    const len = p.path.getTotalLength();
    const pt = p.path.getPointAtLength(len * p.t);
    p.el.setAttribute('cx', pt.x); p.el.setAttribute('cy', pt.y);
  }
}

/* heartbeat ripple — WAAPI, one ring expanding from the node */
function ripple(a) {
  const el = nodeEls.get(a.id); if (!el || reduceMotion.matches) return;
  const pulse = el.querySelector('.pulse');
  pulse.animate(
    [{ opacity: .8, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(2.1)' }],
    { duration: 900, easing: 'cubic-bezier(0.22,1,0.36,1)' });
  el.querySelector('.core').animate(
    [{ '--pca-beatglo': 1 }, { '--pca-beatglo': 0 }], { duration: 900, easing: 'ease-out' });
}

/* ================================================================
   SIMULATION — heartbeats, spend, progress, governance
   ================================================================ */
const SIM = opts.simulate === true;
let simOn = SIM, beatLog = [];
function tickSim(dt, now) {
  if (!simOn) return;
  dt *= 1.6;
  for (const a of agents()) {
    if (a === root || a.status !== 'running') continue;
    a.phase += dt;
    if (a.phase >= a.beatEvery) {
      a.phase = 0; a.lastBeat = now;
      ripple(a);
      beatLog.push(now);
      spawnParticle(a.id, 1, 'oklch(0.68 0.18 261)');            /* delegation in */
      const cost = a.budget * (0.004 + Math.random() * 0.011);
      a.spent += cost;
      feed('♥', `<b>${a.name}</b> heartbeat · ${fmt$(cost)} spent`, a);
      const t = a.tasks.find(t => t.status === 'active');
      if (t) {
        t.progress += 0.12 + Math.random() * 0.2;
        if (t.progress >= 1) {
          t.status = 'done';
          spawnParticle(a.id, -1, 'oklch(0.76 0.17 155)');        /* result out */
          if (isRevenue(a)) company.mrr += 40 + Math.random() * 160;
          toast(`<b>${a.name}</b> completed: ${t.title}`);
          feed('✓', `<b>${a.name}</b> finished: ${t.title}`, a);
          const next = a.tasks.find(x => x.status === 'blocked');
          if (next && Math.random() > .5) next.status = 'active';
        }
      }
      if (a.spent >= a.budget) {                                  /* TRIZ #10: pre-armed stop */
        a.status = 'stopped';
        toast(`<b>${a.name}</b> hit budget and auto-stopped itself. No runaway costs.`);
        feed('■', `<b>${a.name}</b> stopped: budget exhausted`, a);
      }
      if (selected === a) fillPanel(a);
    }
  }
  company.mrr += company.revenueRate * dt * (0.6 + Math.random() * 0.8);
  beatLog = beatLog.filter(t => now - t < 60);
}

/* ================================================================
   MAIN LOOP
   ================================================================ */
let last = performance.now(), kpiAt = 0, alive = true;
function loop(now) {
  if (!alive) return;
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  stepCam(now);
  const moving = stepTween(dt);
  tickSim(dt, now / 1000);
  if (moving || particles.length || simOn || dragCtx) render();
  positionHalo();
  stepParticles(dt);
  if (now - kpiAt > 800) { kpiAt = now; drawKpis(); }
  requestAnimationFrame(loop);
}
function drawKpis() {
  $('#kMrr').textContent  = fmt$(company.mrr);
  const burn = agents().filter(a=>a!==root).reduce((s,a)=>s+a.budget,0);
  $('#kBurn').textContent = fmt$(burn);
  const live = agents().filter(a=>a!==root && a.status==='running').length;
  const el = $('#kLive'); el.textContent = `${live} / ${agents().length-1}`;
  el.className = agents().some(a=>a.status==='stopped') ? 'hot' : '';
  $('#kTasks').textContent = agents().flatMap(a=>a.tasks).filter(t=>t.status==='active'||t.status==='review').length;
  $('#kBeats').textContent = beatLog.length;
}

/* ================================================================
   DIRECT MANIPULATION — drag an agent onto a new manager
   ================================================================ */
let dragCtx = null;
function isDescendant(anc, a) { for (let p = a.parent; p; p = p.parent) if (p === anc) return true; return false; }
function nodeDown(a, el, e) {
  refreshRect();
  if (e.button !== undefined && e.button !== 0) return;
  if (e.target.closest('.badge')) return;
  e.stopPropagation();
  dragCtx = { a, el, sx: LX(e), sy: LY(e), moved: false, target: null };
  try { el.setPointerCapture(e.pointerId); } catch {}
}
docOn(window, 'pointermove', e => {
  if (!dragCtx) return;
  if (!dragCtx.moved) {
    if (Math.hypot(LX(e) - dragCtx.sx, LY(e) - dragCtx.sy) < 7 || dragCtx.a === root) return;
    dragCtx.moved = true; dragCtx.el.classList.add('dragging'); clearHover();
  }
  const a = dragCtx.a;
  a.x = (LX(e) - cam.x) / cam.z; a.y = (LY(e) - cam.y) / cam.z;
  let best = null, bd = 90;
  for (const cand of agents()) {
    if (cand === a || cand === root || cand === a.parent || !visible(cand) || isDescendant(a, cand)) continue;
    const d = Math.hypot(cand.x - a.x, cand.y - a.y);
    if (d < bd) { bd = d; best = cand; }
  }
  if (dragCtx.target && dragCtx.target !== best) nodeEls.get(dragCtx.target.id)?.classList.remove('droptarget');
  if (best) nodeEls.get(best.id).classList.add('droptarget');
  dragCtx.target = best;
});
docOn(window, 'pointerup', () => {
  if (!dragCtx) return;
  const { a, el, moved, target } = dragCtx;
  el.classList.remove('dragging');
  if (target) nodeEls.get(target.id)?.classList.remove('droptarget');
  dragCtx = null;
  if (!moved) { select(a); return; }
  if (target && a.parent && target !== a.parent) {
    a.parent.children = a.parent.children.filter(c => c !== a);
    link(target, a);
    feed('⇄', `<b>${a.name}</b> now reports to <b>${target.name}</b>`, a);
    emit({ type: 'reorg', agentId: a.id, newManagerId: target.id === '__root' ? null : target.id });
    toast(`Re-org: <b>${a.name}</b> → reports to ${target.name}`);
    if (selected === a) fillPanel(a);
  }
  layout(); startTween();
});

/* hover = relationship: light the reporting chain + team, dim the rest */
function hoverBranch(a, on) {
  if (litTask || dragCtx || a === root) return;
  if (!on) return clearHover();
  const set = new Set();
  for (let p = a; p; p = p.parent) set.add(p.id);
  (function down(n) { for (const c of visKids(n)) { set.add(c.id); down(c); } })(a);
  nodeEls.forEach((el, id) => el.classList.toggle('dim', !set.has(id)));
  edgeEls.forEach((el, id) => el.classList.toggle('hov', set.has(id)));
}
function clearHover() {
  if (litTask) return;
  nodeEls.forEach(el => el.classList.remove('dim'));
  edgeEls.forEach(el => el.classList.remove('hov'));
}

/* selection halo: act on the node without leaving the map */
const haloEl = document.createElement('div');
haloEl.id = 'halo'; haloEl.hidden = true;
haloEl.innerHTML = `
  <button data-act="beat"  title="Heartbeat now">⚡</button>
  <button data-act="pause" title="Pause / resume">❚❚</button>
  <button data-act="hire"  title="Hire a report">＋</button>
  <button data-act="focus" title="Fly to agent">⌖</button>`;
rootEl.appendChild(haloEl);
haloEl.addEventListener('pointerdown', e => e.stopPropagation());
haloEl.addEventListener('click', e => {
  const act = e.target.closest('button')?.dataset.act;
  if (!act || !selected || selected === root) return;
  if (act === 'beat' && selected.status === 'running') selected.phase = selected.beatEvery;
  if (act === 'pause') { selected.status = selected.status === 'running' ? 'paused' : 'running'; selected.phase = 0; emit({ type: selected.status === 'running' ? 'resume' : 'pause', agentId: selected.id }); fillPanel(selected); render(); }
  if (act === 'hire') hireDlg.showModal();
  if (act === 'focus') flyTo(selected);
});
function positionHalo() {
  if (!selected || selected === root || !visible(selected)) { haloEl.hidden = true; return; }
  haloEl.hidden = false;
  haloEl.style.left = (selected.x * cam.z + cam.x) + 'px';
  haloEl.style.top  = (selected.y * cam.z + cam.y - 40 * Math.min(cam.z, 1.2) - 10) + 'px';
  haloEl.querySelector('[data-act=pause]').textContent = selected.status === 'running' ? '❚❚' : '▶';
}

/* activity feed: narrate the company, entry click flies to the actor */
const feedEl = document.createElement('div');
feedEl.id = 'feed'; feedEl.setAttribute('aria-label', 'Live activity'); feedEl.setAttribute('role', 'log');
rootEl.appendChild(feedEl);
const FEED_C = { '✓':'var(--ok)', '＋':'var(--ok)', '■':'var(--danger)', '−':'var(--ink-3)', '⇄':'var(--cobalt-hi)' };
function feed(ic, html, a) {
  const ev = document.createElement('div'); ev.className = 'ev';
  ev.innerHTML = `<span class="ic" style="color:${FEED_C[ic] || 'var(--cyan)'}">${ic}</span><span>${html}</span>`;
  if (a) ev.onclick = () => { unfoldTo(a); select(a); flyTo(a); };
  feedEl.appendChild(ev);
  while (feedEl.children.length > 6) feedEl.firstChild.remove();
}

/* ================================================================
   SELECTION + DOSSIER PANEL
   ================================================================ */
let selected = null, litTask = null;
const panel = $('#panel');
function select(a) {
  selected = a;
  nodeEls.forEach((el,id) => el.classList.toggle('selected', id === a.id));
  clearChain();
  fillPanel(a);
  panel.classList.add('open');
}
function deselect() {
  selected = null; panel.classList.remove('open');
  nodeEls.forEach(el => el.classList.remove('selected','dim'));
  clearChain();
}
$('#pClose').onclick = deselect;

const TSTAT = { active:['var(--cyan)','running'], review:['var(--warn)','in review'], blocked:['var(--danger)','blocked'], done:['var(--ok)','done'] };
function fillPanel(a) {
  $('#pGlyph').textContent = a.glyph;
  $('#pName').textContent = a === root ? company.name : a.name;
  $('#pRole').textContent = a === root ? 'Mission control' : a.role;
  $('#pAdapter').textContent = a.adapter;
  const st = $('#pStatus');
  st.textContent = a === root ? 'company' : a.status;
  st.style.setProperty('--status-c', statusColor(a));
  $('#pBeat').textContent = a === root ? '—' : `every ${a.beatEvery}s`;
  $('#pLast').textContent = a === root ? '—' : a.lastBeat ? `${Math.max(0, (performance.now()/1000 - a.lastBeat)).toFixed(0)}s ago` : 'never';
  $('#pSpend').textContent = a === root ? fmt$(company.mrr) + ' MRR' : `${fmt$(a.spent)} / ${fmt$(a.budget)}`;
  $('#pReports').textContent = a.children.length || 'none';
  const bud = $('#pBudget');
  bud.value = a.budget || 0; bud.disabled = a === root;
  $('#pBudgetOut').textContent = a === root ? '—' : fmt$(a.budget) + ' / mo';
  const list = $('#pTasks'); list.innerHTML = '';
  for (const t of a.tasks) {
    const li = document.createElement('li');
    const [c, label] = TSTAT[t.status] || TSTAT.active;
    li.innerHTML = `<span class="tdot" style="background:${c}"></span><span>${t.title}</span><span class="tst">${label}</span>`;
    li.onclick = () => lightChain(t, li);
    if (litTask === t) li.classList.add('on');
    list.appendChild(li);
  }
  $('#aPause').textContent = a.status === 'running' ? '❚❚ Pause' : '▶ Resume';
  $('#aPause').disabled = $('#aBeat').disabled = $('#aFire').disabled = (a === root);
  $('#aBeat').disabled = a === root || a.status !== 'running';
}

$('#pBudget').addEventListener('input', e => {
  if (!selected || selected === root) return;
  selected.budget = +e.target.value;
  emit({ type: 'budget', agentId: selected.id, budget: selected.budget });
  $('#pBudgetOut').textContent = fmt$(selected.budget) + ' / mo';
  if (selected.status === 'stopped' && selected.spent < selected.budget) {
    selected.status = 'running';
    toast(`<b>${selected.name}</b> re-funded and back online.`);
    feed('▶', `<b>${selected.name}</b> re-funded, back online`, selected);
    fillPanel(selected);
  }
  render();
});
$('#aPause').onclick = () => {
  if (!selected || selected === root) return;
  selected.status = selected.status === 'running' ? 'paused' : 'running';
  emit({ type: selected.status === 'running' ? 'resume' : 'pause', agentId: selected.id });
  selected.phase = 0;
  fillPanel(selected); render();
};
$('#aBeat').onclick = () => { if (selected && selected !== root) { selected.phase = selected.beatEvery; emit({ type: 'beat', agentId: selected.id }); } };
$('#aFire').onclick = () => {
  if (!selected || selected === root || selected.parent === root) { toast('The top of the org answers only to the board.'); return; }
  const a = selected;
  a.parent.children = a.parent.children.filter(c => c !== a);
  toast(`<b>${a.name}</b> off-boarded. ${a.tasks.filter(t=>t.status!=='done').length} open tasks returned to ${a.parent.name}.`);
  feed('−', `<b>${a.name}</b> off-boarded, tasks back to ${a.parent.name}`);
  emit({ type: 'fire', agentId: a.id });
  a.tasks.filter(t=>t.status!=='done').forEach(t => { t.owner = a.parent; a.parent.tasks.push(t); });
  deselect(); syncDom(); layout(); startTween();
};

/* hire flow */
const hireDlg = $('#hireDlg');
$('#aHire').onclick = () => { if (selected && selected !== root) hireDlg.showModal(); };
$('#hireForm').addEventListener('submit', e => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  const boss = selected; if (!boss) return;
  const n = agent({
    name: $('#hName').value.trim() || 'Nova',
    role: $('#hRole').value.trim() || 'Specialist',
    glyph: GLYPHS.generic, adapter: $('#hAdapter').value,
    budget: 300, beatEvery: 18 + Math.round(Math.random()*14),
  });
  link(boss, n);
  task(n, `Onboard: read ${company.name} goal + ${boss.name}'s brief`, boss.tasks[0] || tGoal);
  syncDom(); layout(); startTween();
  const el = nodeEls.get(n.id);
  n.x = boss.x; n.y = boss.y;   /* pop out of the manager */
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
  toast(`<b>${n.name}</b> hired, reporting to ${boss.name}.`);
  feed('＋', `<b>${n.name}</b> hired under ${boss.name}`, n);
  emit({ type: 'hire', managerId: boss.id, agent: { id: n.id, name: n.name, role: n.role, adapter: n.adapter, budget: n.budget } });
  $('#hireForm').reset();
});

/* ================================================================
   WHY-CHAIN — light the lineage from a task to the mission
   ================================================================ */
function clearChain() {
  litTask = null;
  edgeEls.forEach(e => e.classList.remove('lit'));
  nodeEls.forEach(el => el.classList.remove('dim'));
  $('#whychain').hidden = true;
}
function lightChain(t, li) {
  if (litTask === t) { clearChain(); fillPanel(selected); return; }
  clearChain(); litTask = t;
  rootEl.querySelectorAll('#pTasks li').forEach(x => x.classList.remove('on'));
  if (li) li.classList.add('on');
  const chain = []; let cur = t;
  while (cur) { chain.push(cur); cur = cur.parent; }
  const owners = new Set(chain.map(c => c.owner.id)); owners.add('root');
  /* light every edge on the ownership path root→…→owner */
  for (const id of owners) {
    let a = agents().find(x => x.id === id);
    while (a && a.parent) { edgeEls.get(a.id)?.classList.add('lit'); owners.add(a.parent.id); a = a.parent; }
  }
  nodeEls.forEach((el, id) => el.classList.toggle('dim', !owners.has(id)));
  const wc = $('#whychain'); wc.hidden = false;
  wc.innerHTML = '<div class="section-h" style="margin:0 0 6px">Why this exists</div>' + chain.map((c, i) =>
    `<div class="wc-row ${c.parent ? '' : 'goal'}">
       <span class="arr">${i === 0 ? '●' : 'because ↳'}</span>
       <span><b>${c.title}</b> <span class="wc-who">— ${c.owner === root ? 'company goal' : c.owner.name}</span></span>
     </div>`).join('');
}

/* ================================================================
   COMMAND BAR + KEYS
   ================================================================ */
const cmdInput = $('#cmdInput'), results = $('#results');
let hot = -1;
cmdInput.addEventListener('input', () => {
  const q = cmdInput.value.trim().toLowerCase();
  results.innerHTML = ''; hot = -1;
  if (!q) { results.classList.remove('show'); return; }
  const hits = agents().filter(a => a !== root && (a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q))).slice(0, 6);
  for (const a of hits) {
    const b = document.createElement('button');
    b.innerHTML = `<span>${a.glyph}</span><span>${a.name}</span><span class="rrole">${a.role}</span>`;
    b.onclick = () => { jump(a); };
    results.appendChild(b);
  }
  results.classList.toggle('show', hits.length > 0);
});
function jump(a) {
  cmdInput.value = ''; results.classList.remove('show'); cmdInput.blur();
  unfoldTo(a); select(a); flyTo(a);
}
cmdInput.addEventListener('keydown', e => {
  const opts = [...results.querySelectorAll('button')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    hot = (hot + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % Math.max(1, opts.length);
    opts.forEach((o, i) => o.classList.toggle('hot', i === hot));
  } else if (e.key === 'Enter' && opts.length) { (opts[hot] || opts[0]).click(); }
  else if (e.key === 'Escape') { cmdInput.value=''; results.classList.remove('show'); cmdInput.blur(); }
});
docOn(document, 'keydown', e => {
  if (!rootEl.isConnected) return;
  if (e.target.matches('input, select, textarea')) return;
  if (!rootEl.contains(document.activeElement) && document.activeElement !== document.body) return;
  if (e.key === '/') { e.preventDefault(); cmdInput.focus(); }
  if (e.key === 'Escape') deselect();
  if (e.key === '0') fit();
  if (e.key === '+' || e.key === '=') zoomBy(1.25);
  if (e.key === '-') zoomBy(0.8);
});
function zoomBy(f) {
  const nz = Math.min(2.6, Math.max(0.22, cam.z * f));
  cam.x = VW()/2 - (VW()/2 - cam.x) * (nz/cam.z);
  cam.y = VH()/2 - (VH()/2 - cam.y) * (nz/cam.z);
  cam.z = nz; applyCam();
}

$('#fitBtn').onclick = () => fit();
function setLayoutMode(m) {
  layoutMode = m;
  storSet('pc-atlas-layout', m);
  $('#layoutBtn').textContent = m === 'tree' ? '⌾ Constellation' : '⋔ Hierarchy';
  layout(); startTween(); setTimeout(() => fit(), 120);
}
$('#layoutBtn').onclick = () => setLayoutMode(layoutMode === 'tree' ? 'radial' : 'tree');
$('#simBtn').onclick = e => {
  simOn = !simOn;
  e.currentTarget.textContent = simOn ? '❚❚ Sim' : '▶ Sim';
  toast(simOn ? 'Simulation resumed.' : 'Simulation paused; the map is frozen.');
};
$('#pauseAll').onclick = () => { agents().forEach(a => { if (a!==root && a.status==='running') a.status='paused'; }); render(); if (selected) fillPanel(selected); toast('All agents paused.'); };
$('#runAll').onclick = () => { agents().forEach(a => { if (a!==root && a.status!=='stopped') a.status='running'; }); render(); if (selected) fillPanel(selected); toast('All agents running.'); };

/* toast */
let toastTimer;
function toast(html) {
  const t = $('#toast'); if (!t) return; t.innerHTML = html; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3400);
}

/* ================================================================
   BOOT
   ================================================================ */
$('#coName').textContent = company.name;
const kMrrLabel = $('#kMrr').previousElementSibling; if (kMrrLabel) kMrrLabel.textContent = company.metricLabel;
if (!SIM) $('#simBtn').hidden = true;
$('#layoutBtn').textContent = layoutMode === 'tree' ? '⌾ Constellation' : '⋔ Hierarchy';
layout();
for (const a of agents()) { a.x = a.tx * 0.2; a.y = a.ty * 0.2; }  /* unfold from center */
syncDom(); startTween(); render(); fit(false); applyCam();
requestAnimationFrame(loop);
setTimeout(() => toast('Click an agent · <b>drag it onto a new manager</b> to re-org · double-click to fold a branch'), 700);
setTimeout(() => { if (!selected) toast('Scroll to zoom · drag the canvas to pan · <b>/</b> to search'); }, 5600);
const ro = new ResizeObserver(() => { refreshRect(); applyCam(); }); ro.observe(rootEl);

/* ================================================================
   HOST EVENT INGESTION + INSTANCE API
   ================================================================ */
function applyEvent(evt) {
  const a = evt.agentId ? agents().find(x => x.id === evt.agentId) : null;
  switch (evt.type) {
    case 'beat':
      if (a) {
        a.lastBeat = performance.now() / 1000;
        ripple(a); spawnParticle(a.id, 1, 'oklch(0.68 0.18 261)');
        if (evt.cost) a.spent += evt.cost;
        feed('\u2665', `<b>${a.name}</b> heartbeat${evt.cost ? ` \u00b7 ${fmt$(evt.cost)} spent` : ''}`, a);
      }
      break;
    case 'agent':
      if (a && evt.patch) { Object.assign(a, evt.patch); if (selected === a) fillPanel(a); }
      break;
    case 'task': {
      const owner = byId.get(evt.task?.ownerId) || a || root;
      let t = taskById.get(evt.task?.id);
      if (t) Object.assign(t, { title: evt.task.title ?? t.title, status: evt.task.status ?? t.status, progress: evt.task.progress ?? t.progress });
      else {
        t = { id: evt.task.id || 'local-t' + (++TID), owner, title: evt.task.title, status: evt.task.status || 'active',
              progress: evt.task.progress ?? 0, parent: (evt.task.parentId && taskById.get(evt.task.parentId)) || tGoal };
        owner.tasks.push(t); taskById.set(t.id, t);
      }
      if (selected === t.owner) fillPanel(selected);
      break;
    }
    case 'taskDone': {
      const t = taskById.get(evt.taskId);
      if (t) {
        t.status = 'done'; t.progress = 1;
        if (t.owner !== root) spawnParticle(t.owner.id, -1, 'oklch(0.76 0.17 155)');
        feed('\u2713', `<b>${t.owner.name}</b> finished: ${t.title}`, t.owner === root ? null : t.owner);
        if (selected === t.owner) fillPanel(selected);
      }
      break;
    }
    case 'company':
      if (evt.patch) Object.assign(company, evt.patch);
      break;
    case 'feed':
      feed(evt.icon || '\u00b7', evt.html, a);
      break;
  }
  render();
}

function destroy() {
  alive = false;
  simOn = false;
  for (const fn of _cleanups) fn();
  try { ro.disconnect(); } catch {}
  particles.length = 0;
  rootEl.innerHTML = '';
  rootEl.classList.remove('pc-atlas');
}

return {
  applyEvent,
  destroy,
  fit: () => fit(),
  select: id => { const a = agents().find(x => x.id === id); if (a && a !== root) { unfoldTo(a); select(a); flyTo(a); } },
  setLayout: m => setLayoutMode(m === 'radial' ? 'radial' : 'tree'),
  getAgents: () => agents().filter(a => a !== root).map(a => ({
    id: a.id, name: a.name, role: a.role, status: a.status,
    parentId: a.parent === root ? null : a.parent.id,
    spent: a.spent, budget: a.budget,
  })),
};
}

export default mountAtlas;

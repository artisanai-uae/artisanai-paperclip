import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const PLUGIN_ID = "artisanai.atlas";
const PLUGIN_VERSION = "0.1.0";

/**
 * Atlas mounts one full-page UI slot: a living mindmap/orgchart command
 * surface over the company's agents, budgets, heartbeats, and task lineage.
 */
const manifest: PaperclipPluginManifestV1 = {
  id: PLUGIN_ID,
  apiVersion: 1,
  version: PLUGIN_VERSION,
  displayName: "Atlas — org command map",
  description:
    "Visual command surface for the whole company: a hierarchical mindmap of agents with live heartbeats, budget rings, drag-to-re-org, and why-chain task lineage.",
  author: "ArtisanAI",
  categories: ["ui"],
  capabilities: ["companies.read", "issues.read"],
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "page",
        id: "atlas",
        displayName: "Atlas",
        exportName: "AtlasPage",
        routePath: "atlas",
      },
    ],
  },
};

export default manifest;

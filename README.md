# ArtisanAI Paperclip — Atlas

Visual command surface for [Paperclip](https://github.com/paperclipai/paperclip), the open-source control plane for autonomous AI companies.

**Atlas** renders a whole Paperclip company as one living map: a hierarchical mindmap/orgchart where every agent node carries its own instruments — heartbeat pulse, conic budget ring, status color — tasks trace their "because →" why-chain to the mission, and the org is managed by direct manipulation (fold branches, drag agents between managers, pause/fund/hire in place).

- [`atlas/`](atlas/) — the engine (zero-dependency ES module), demo harness, Paperclip REST adapter, and a Paperclip plugin package. See [atlas/README.md](atlas/README.md) for embedding and bolt-on instructions.
- [`PRODUCT.md`](PRODUCT.md) — design register, principles, and rationale.

## Quick start

```bash
python3 -m http.server 8931 --directory atlas
# open http://localhost:8931 — a simulated company (NoteWiz, Inc.) runs live
```

Interactions: scroll to zoom (semantic: dots → rings → dossiers) · drag canvas to pan · click an agent for halo actions + dossier · drag an agent onto a new manager to re-org · double-click to fold a branch · `/` to search · click any task to light its why-chain to the mission · toggle Hierarchy ⇄ Constellation top-right.

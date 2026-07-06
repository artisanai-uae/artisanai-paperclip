import { definePlugin, runWorker } from "@paperclipai/plugin-sdk";

/**
 * Atlas is UI-only: the worker exists to satisfy the plugin lifecycle and
 * answer health probes. All data access happens from the page component via
 * the ordinary Paperclip HTTP API (see PLUGIN_SPEC.md on UI trust model).
 */
const plugin = definePlugin({
  async setup(ctx) {
    ctx.logger.info("atlas plugin ready (UI-only)");
  },
  async onHealth() {
    return { status: "ok", message: "Atlas UI plugin ready" };
  },
});

export default plugin;
runWorker(plugin, import.meta.url);

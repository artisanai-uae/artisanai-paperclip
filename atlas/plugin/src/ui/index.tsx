import { useEffect, useRef } from "react";
import type { PluginWidgetProps } from "@paperclipai/plugin-sdk/ui";

/**
 * Full-page Atlas view. The engine (atlas.js) and adapter are framework-free
 * ES modules copied into dist/ui/ at build time; we load them relative to
 * this bundle so the host needs no extra bundler config.
 */
export function AtlasPage({ context }: PluginWidgetProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let atlas: { destroy(): void; applyEvent(e: unknown): void } | null = null;
    let adapter: { start(a: unknown): void; stop(): void; onAction(a: unknown): void } | null = null;
    let cancelled = false;

    (async () => {
      const base = new URL(".", import.meta.url);
      const [{ mountAtlas }, { createPaperclipAdapter }, { demoModel }] = await Promise.all([
        import(/* @vite-ignore */ new URL("./atlas.js", base).href),
        import(/* @vite-ignore */ new URL("./paperclip-adapter.js", base).href),
        import(/* @vite-ignore */ new URL("./demo.js", base).href),
      ]);
      if (cancelled || !hostRef.current) return;

      if (context?.companyId) {
        adapter = createPaperclipAdapter({ companyId: context.companyId });
        let model;
        try {
          model = await adapter!.load();
        } catch (err) {
          console.warn("[atlas] live load failed, falling back to demo model:", err);
          model = demoModel();
          adapter = null;
        }
        if (cancelled || !hostRef.current) return;
        atlas = mountAtlas(hostRef.current, {
          model,
          simulate: false,
          onAction: (a: unknown) => adapter?.onAction(a),
        });
        adapter?.start(atlas);
      } else {
        atlas = mountAtlas(hostRef.current, { model: demoModel(), simulate: true });
      }
    })();

    return () => {
      cancelled = true;
      adapter?.stop();
      atlas?.destroy();
    };
  }, [context?.companyId]);

  return <div ref={hostRef} style={{ width: "100%", height: "100%", minHeight: "70vh" }} />;
}

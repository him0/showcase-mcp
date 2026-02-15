import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { launchWindow, type NeutralinoWindow } from "./neutralino.js";
import { buildHTML } from "../ui/template.js";
import type { DisplayContent } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, "..", "..", "assets");
const require = createRequire(import.meta.url);

// Cached static assets
let cachedBundleJs: string | null = null;
let cachedStylesCss: string | null = null;
let cachedMermaidJs: string | null = null;

function getBundleJs(): string {
  cachedBundleJs ??= readFileSync(join(assetsDir, "bundle.js"), "utf-8");
  return cachedBundleJs;
}

function getStylesCss(): string {
  cachedStylesCss ??= readFileSync(join(assetsDir, "styles.css"), "utf-8");
  return cachedStylesCss;
}

function getMermaidJs(): string {
  cachedMermaidJs ??= readFileSync(
    join(dirname(require.resolve("mermaid")), "mermaid.min.js"),
    "utf-8",
  );
  return cachedMermaidJs;
}

// Window instance state
interface SSEClient {
  send: (event: string, data: string) => void;
  close: () => void;
}

interface WindowInstance {
  id: string;
  serverHandle: ReturnType<typeof serve> | null;
  neuWindow: NeutralinoWindow | null;
  currentContent: DisplayContent | null;
  sseClients: Map<symbol, SSEClient>;
}

const instances = new Map<string, WindowInstance>();

function isWindowAlive(instance: WindowInstance): boolean {
  if (!instance.neuWindow) return false;
  return instance.neuWindow.process.exitCode === null && !instance.neuWindow.process.killed;
}

function broadcastContent(instance: WindowInstance, content: DisplayContent): void {
  const data = JSON.stringify(content);
  for (const [id, client] of instance.sseClients) {
    try {
      client.send("content", data);
    } catch (err) {
      console.error(`[showcase-mcp] SSE send failed:`, err);
      instance.sseClients.delete(id);
    }
  }
}

function cleanupInstance(instance: WindowInstance): void {
  for (const [, client] of instance.sseClients) {
    try {
      client.close();
    } catch {}
  }
  instance.sseClients.clear();
  instance.neuWindow?.cleanup();
  instance.neuWindow = null;
  try {
    instance.serverHandle?.close();
  } catch {}
  instances.delete(instance.id);
}

function cleanupAll(): void {
  const all = [...instances.values()];
  for (const instance of all) {
    cleanupInstance(instance);
  }
}

function createApp(instance: WindowInstance): Hono {
  const app = new Hono();

  app.get("/", (c) => c.html(buildHTML("Showcase MCP")));

  app.get("/bundle.js", (c) => {
    c.header("Content-Type", "application/javascript; charset=utf-8");
    return c.body(getBundleJs());
  });

  app.get("/styles.css", (c) => {
    c.header("Content-Type", "text/css; charset=utf-8");
    return c.body(getStylesCss());
  });

  app.get("/mermaid.min.js", (c) => {
    c.header("Content-Type", "application/javascript; charset=utf-8");
    return c.body(getMermaidJs());
  });

  app.get("/events", (c) => {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const clientId = Symbol();

        const send = (event: string, data: string) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
          } catch {}
        };

        const close = () => {
          try {
            controller.close();
          } catch {}
        };

        instance.sseClients.set(clientId, { send, close });

        if (instance.currentContent) {
          send("content", JSON.stringify(instance.currentContent));
        }
      },
      cancel() {},
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });

  return app;
}

function startServerAndWindow(id: string, content: DisplayContent, windowTitle?: string): Promise<WindowInstance> {
  return new Promise<WindowInstance>((resolve) => {
    const inst: WindowInstance = {
      id,
      serverHandle: null,
      neuWindow: null,
      currentContent: content,
      sseClients: new Map(),
    };

    const app = createApp(inst);

    inst.serverHandle = serve(
      { fetch: app.fetch, port: 0, hostname: "127.0.0.1" },
      (info) => {
        const url = `http://127.0.0.1:${info.port}`;
        console.error(`[showcase-mcp] Listening on ${url}`);

        try {
          inst.neuWindow = launchWindow(url, windowTitle ?? "Showcase MCP");
          inst.neuWindow.process.on("exit", () => {
            cleanupInstance(inst);
          });
        } catch (err) {
          console.error(`[showcase-mcp] Failed to launch window: ${err}`);
          console.error(`[showcase-mcp] Please visit manually: ${url}`);
        }
        instances.set(id, inst);
        resolve(inst);
      },
    );
  });
}

export async function showContent(
  content: DisplayContent,
  windowId?: string,
): Promise<string> {
  if (windowId) {
    const existing = instances.get(windowId);
    if (existing && isWindowAlive(existing)) {
      existing.currentContent = content;
      broadcastContent(existing, content);
      return windowId;
    }
    if (existing) {
      cleanupInstance(existing);
    }
  }

  const newId = randomUUID();
  await startServerAndWindow(newId, content, content.title);
  return newId;
}

// Cleanup on process exit
process.on("exit", () => cleanupAll());
process.on("SIGINT", () => {
  cleanupAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanupAll();
  process.exit(0);
});

import { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import type { DisplayContent } from "../types.js";

function getMermaid(): { render: (id: string, source: string) => Promise<{ svg: string }> } | undefined {
  return (window as unknown as Record<string, unknown>).mermaid as ReturnType<typeof getMermaid>;
}

function MermaidDiagram({ source }: { source: string }) {
  const [svg, setSvg] = useState<string>("");
  const idRef = useRef(`mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = getMermaid();
        if (!m) return;
        const result = await m.render(idRef.current, source);
        if (!cancelled) setSvg(result.svg);
      } catch (e) {
        console.error("Mermaid render error:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [source]);

  if (!svg) return <pre className="mb-6 text-sm text-gray-500">{source}</pre>;
  return (
    <div className="mb-6" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

function MarkdownContent({ content }: { content: string }) {
  const html = marked.parse(content, { async: false, breaks: true });
  return (
    // Content is from MCP tool input (local/trusted source), intentionally unsanitized
    <div
      className="prose prose-gray mb-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function RawHtml({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = html;
    // dangerouslySetInnerHTML does not execute <script> tags, so we do it manually
    const scripts = el.querySelectorAll("script");
    scripts.forEach((orig) => {
      const s = document.createElement("script");
      for (const attr of orig.attributes) {
        s.setAttribute(attr.name, attr.value);
      }
      s.textContent = orig.textContent;
      orig.replaceWith(s);
    });
  }, [html]);

  return <div className="mb-6" ref={containerRef} />;
}

export function App() {
  const [content, setContent] = useState<DisplayContent | null>(null);

  useEffect(() => {
    const eventSource = new EventSource("/events");

    eventSource.addEventListener("content", (e) => {
      try {
        const data = JSON.parse(e.data) as DisplayContent;
        setContent(data);
        document.title = `showcase-mcp - ${data.title}`;
      } catch (err) {
        console.error("Failed to parse SSE content:", err);
      }
    });

    eventSource.onerror = () => {
      // EventSource auto-reconnects by default
    };

    return () => eventSource.close();
  }, []);

  if (!content) {
    return (
      <div className="bg-white rounded-2xl shadow-lg w-full p-8 flex-1">
        <div className="text-center py-12 text-gray-400">
          <div className="animate-pulse">Waiting for content...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full p-8 flex-1">
      {content.message && <MarkdownContent content={content.message} />}
      {content.mermaid && <MermaidDiagram source={content.mermaid} />}
      {content.imageUrl && (
        <div className="mb-6">
          <img
            src={content.imageUrl}
            alt=""
            className="max-w-full rounded-lg"
          />
        </div>
      )}
      {/* Raw HTML from MCP tool input (local/trusted source), intentionally unsanitized */}
      {content.html && <RawHtml html={content.html} />}
    </div>
  );
}

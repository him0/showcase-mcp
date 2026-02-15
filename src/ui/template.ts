function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildHTML(title: string): string {
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title><link rel="stylesheet" href="/styles.css"><script src="/mermaid.min.js"><\/script><script>mermaid.initialize({startOnLoad:false,fontSize:12,flowchart:{nodeSpacing:30,rankSpacing:30,padding:8}});<\/script></head><body class="bg-gray-50 min-h-screen p-4 flex flex-col"><div id="root" class="flex flex-col flex-1"></div><script src="/bundle.js"><\/script></body></html>`;
}

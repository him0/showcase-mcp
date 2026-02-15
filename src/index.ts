import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { showContent } from "./server/window-manager.js";

const server = new McpServer({ name: "showcase-mcp", version: "0.1.0" });

server.tool(
  "show",
  "Display rich content (Markdown, HTML, Mermaid diagrams, images) in a window. Pass windowId to update an existing window's content. Omit windowId to open a new window. Returns the windowId for future updates.",
  {
    title: z.string().describe("Title displayed at the top of the window"),
    message: z.string().optional().describe("Markdown-formatted message body"),
    html: z.string().optional().describe("Raw HTML content to display"),
    mermaid: z.string().optional().describe("Mermaid diagram source code to render visually"),
    imageUrl: z.string().optional().describe("URL of an image to display"),
    windowId: z.string().optional().describe("Window ID to update. Omit to open a new window."),
  },
  async (params) => {
    const content = {
      title: params.title,
      message: params.message,
      html: params.html,
      mermaid: params.mermaid,
      imageUrl: params.imageUrl,
    };
    const windowId = await showContent(content, params.windowId);
    return {
      content: [{ type: "text" as const, text: JSON.stringify({ windowId }) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);

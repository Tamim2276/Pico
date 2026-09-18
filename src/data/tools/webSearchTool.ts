import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Returns search-result data for an inline preview card instead of
 * immediately handing off to the browser. The chat layer renders this as
 * a small embedded results view (see WebPreviewCard.tsx) with its own
 * "Open in Browser" button for anyone who wants the full experience —
 * same shape as how routes render an inline OSM map instead of always
 * jumping to the Maps app.
 *
 * Preview target: Google Search, using the `igu=1` parameter — an
 * unofficial but widely used trick that gets Google to skip the
 * frame-busting header it normally sends, so the page can actually load
 * inside a WebView. This is NOT a guaranteed-stable API: Google can
 * change or block this at any time, and even with it, Google is far more
 * aggressive than most sites about detecting and CAPTCHA-blocking
 * automated/embedded traffic (the same kind of embedding-hostile
 * behavior already hit with OSM's tiles and Nominatim). WebPreviewCard
 * detects a block page and falls back gracefully with an "Open in
 * Browser" button either way, since that still works normally.
 */
export const webSearchTool: Tool = {
  name: "search_web",
  description:
    "Search the web for something and show a quick preview in chat, with an option to open the full results in the browser. Use for things Pico can't answer directly, like live sports scores, news, or general lookups.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "What to search for, e.g. 'UCL scores today'.",
      },
    },
    required: ["query"],
  },
  execute: async ({ query }: { query?: string }): Promise<ToolResult> => {
    const q = query?.trim();
    if (!q) {
      return { ok: false, message: "What should I search for?" };
    }

    const previewUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&igu=1`;
    const browserUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;

    return {
      ok: true,
      message: `Here's a quick look for "${q}":`,
      data: { query: q, previewUrl, browserUrl },
    };
  },
};



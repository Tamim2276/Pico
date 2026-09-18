import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Answers general-knowledge / current-info questions Pico has no dedicated
 * tool for — "what is the current price of gold", "when does X release",
 * "who is the president of Y" — using free, keyless sources:
 *
 *  1. DuckDuckGo's Instant Answer API — good for defined facts, infoboxes,
 *     unit conversions, and well-established entities. No key, no card.
 *  2. Wikipedia's REST summary API as a fallback — good general-knowledge
 *     coverage, also free/keyless.
 *
 * Honest limitation: neither source has a real-time feed for things like
 * live commodity/stock prices, so "current gold price" may come back with
 * a stale or missing answer even when the tool runs successfully. This
 * tool is for *facts*, not live numeric feeds — a true live price needs a
 * dedicated financial API (which needs its own signup/key).
 */

/**
 * Strips generic question phrasing down to the core topic/entity, since
 * Wikipedia's search is title-matching (not natural-language QA) and
 * DuckDuckGo's instant answers trigger on topics/entities, not full
 * sentences. "what is the capital of malaysia" -> "capital of malaysia";
 * "who is the president of brazil" -> "president of brazil".
 */
function extractTopic(query: string): string {
  return query
    .replace(/^(please\s+)?(tell me|look up|search for)\s+/i, "")
    .replace(/^(what|who|when|where|which|how much|how many)\s+(is|are|was|were|will|do|does|did)\s+/i, "")
    .replace(/^(the\s+)/i, "")
    .replace(/\s+(called|right now|currently|today)\s*$/i, "")
    .trim();
}

/**
 * Wraps a fetch with a timeout, since a genuinely unreachable host (bad
 * route, dead DNS entry, restrictive network) can otherwise hang far
 * longer than a user will wait — better to fail fast and let the next
 * source or the web-search fallback take over.
 */
async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tryDuckDuckGo(query: string): Promise<string | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query
    )}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    const json = await res.json();

    const text: string | undefined =
      json.AbstractText || json.Answer || json.Definition;

    if (!text) return null;

    const source = json.AbstractSource || json.DefinitionSource;
    return source ? `${text} (via ${source})` : text;
  } catch (e) {
    // Network-level failure (unreachable host, timeout, DNS, etc.) on
    // this one source shouldn't stop the other source from being tried.
    console.warn(`[answerQuestionTool] DuckDuckGo lookup failed for "${query}":`, e);
    return null;
  }
}

async function tryWikipedia(query: string): Promise<string | null> {
  try {
    // Full-text search (not opensearch's title-prefix matching) — needed
    // because queries like "capital of malaysia" won't prefix-match a
    // title like "Malaysia", but full-text search ranks it top by
    // relevance.
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1` +
      `&srsearch=${encodeURIComponent(query)}`;

    const searchRes = await fetchWithTimeout(searchUrl);
    if (!searchRes.ok) return null;
    const searchJson = await searchRes.json();
    const title: string | undefined = searchJson?.query?.search?.[0]?.title;
    if (!title) return null;

    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}`;
    const summaryRes = await fetchWithTimeout(summaryUrl);
    if (!summaryRes.ok) return null;
    const summaryJson = await summaryRes.json();

    const extract: string | undefined = summaryJson?.extract;
    return extract ? `${extract} (via Wikipedia — ${title})` : null;
  } catch (e) {
    console.warn(`[answerQuestionTool] Wikipedia lookup failed for "${query}":`, e);
    return null;
  }
}

export const answerQuestionTool: Tool = {
  name: "answer_question",
  description:
    "Look up a general-knowledge or current-info question Pico doesn't have a dedicated tool for — facts, definitions, release dates, prices, 'what/who/when' questions — and answer directly in chat.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The question or topic to look up, e.g. 'current gold price' or 'Avengers Doomsday release date'.",
      },
    },
    required: ["query"],
  },
  execute: async ({ query }: { query?: string }): Promise<ToolResult> => {
    const q = query?.trim();
    if (!q) {
      return { ok: false, message: "What would you like me to look up?" };
    }

    const topic = extractTopic(q);

    try {
      // Try the cleaned topic first (matches Wikipedia/DDG better), then
      // fall back to the raw phrasing in case the cleanup over-stripped
      // it — skip the repeat calls if cleaning didn't change anything.
      let answer = (await tryDuckDuckGo(topic)) ?? (await tryWikipedia(topic));

      if (!answer && topic !== q) {
        answer = (await tryDuckDuckGo(q)) ?? (await tryWikipedia(q));
      }

      if (!answer) {
        // No direct fact found — automatically show a web-search preview
        // instead of asking permission first. The person already asked a
        // question; a search is the obvious next step, not something
        // that needs a confirmation round-trip.
        return {
          ok: true,
          message: `I couldn't find a direct answer for "${q}" — here's a web search instead:`,
          data: {
            query: q,
            previewUrl: `https://www.google.com/search?q=${encodeURIComponent(q)}&igu=1`,
            browserUrl: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
          },
        };
      }

      return { ok: true, message: answer };
    } catch (e: any) {
      return { ok: false, message: `Couldn't look that up: ${e?.message ?? e}` };
    }
  },
};

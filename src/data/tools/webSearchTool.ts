import { Linking } from "react-native";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Hand-off tool: opens the device's default browser with a Google search
 * for the given query. Good for anything Pico can't answer on-device —
 * live scores, news, "who won X", etc.
 *
 * Like the other hand-off tools (maps, YouTube), this is one-way: Pico
 * launches the search, it can't read the results back.
 */
export const webSearchTool: Tool = {
  name: "search_web",
  description:
    "Search the web for something and open the results in the browser. Use for things Pico can't answer directly, like live sports scores, news, or general lookups.",
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

    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;

    try {
      await Linking.openURL(url);
      return { ok: true, message: `Searching the web for "${q}".` };
    } catch (e: any) {
      return { ok: false, message: `Couldn't open the browser: ${e?.message ?? e}` };
    }
  },
};

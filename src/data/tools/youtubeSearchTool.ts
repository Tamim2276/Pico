import { Linking, Platform } from "react-native";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Hand-off tool: opens YouTube's search results for a query (e.g. a song,
 * artist, or "play the news briefing"). This launches the native YouTube
 * app if installed, otherwise falls back to the website.
 *
 * NOTE: this only opens the search results page — it can't auto-play the
 * first result. Auto-play would need the YouTube Data/IFrame APIs and an
 * in-app player, which is a bigger lift than a simple hand-off.
 */
export const youtubeSearchTool: Tool = {
  name: "search_youtube",
  description:
    "Search YouTube for a song, video, or artist and open the results. Use for requests like 'play <song>' or 'find a video about X'.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "What to search for on YouTube, e.g. a song title or artist name.",
      },
    },
    required: ["query"],
  },
  execute: async ({ query }: { query?: string }): Promise<ToolResult> => {
    const q = query?.trim();
    if (!q) {
      return { ok: false, message: "What should I search for on YouTube?" };
    }

    const encoded = encodeURIComponent(q);
    const webUrl = `https://www.youtube.com/results?search_query=${encoded}`;
    const nativeUrl =
      Platform.OS === "ios"
        ? `youtube://results?search_query=${encoded}`
        : `vnd.youtube://results?search_query=${encoded}`;

    try {
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      await Linking.openURL(canOpenNative ? nativeUrl : webUrl);
      return { ok: true, message: `Searching YouTube for "${q}".` };
    } catch (e: any) {
      return { ok: false, message: `Couldn't open YouTube: ${e?.message ?? e}` };
    }
  },
};

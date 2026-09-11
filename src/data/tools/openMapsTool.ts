import { Linking, Platform } from "react-native";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Preliminary "hand-off" tool: launches Google Maps (native app if installed,
 * otherwise the web fallback) optionally centered on a search query/address.
 *
 * This is a one-way hand-off — Pico can tell Maps where to go, but can't
 * read anything back from it (no route info, ETA, etc.). For that, see
 * getRouteTool.ts, which computes distance/ETA directly instead of handing
 * off to another app.
 */
export const openMapsTool: Tool = {
  name: "open_in_maps",
  description:
    "Open Google Maps, optionally centered on a place, address, or search query. Use when the user wants to see a location on a map or hand off to the Maps app.",
  parameters: {
    type: "object",
    properties: {
      destination: {
        type: "string",
        description:
          "Place name, address, or search query to show in Maps. Leave empty to just open the Maps app.",
      },
    },
  },
  execute: async ({
    destination,
  }: {
    destination?: string;
  }): Promise<ToolResult> => {
    const query = destination?.trim();

    const webUrl = query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : `https://www.google.com/maps`;

    const nativeUrl =
      Platform.OS === "ios"
        ? query
          ? `comgooglemaps://?q=${encodeURIComponent(query)}`
          : `comgooglemaps://`
        : query
          ? `geo:0,0?q=${encodeURIComponent(query)}`
          : `geo:0,0?q=`;

    try {
      const canOpenNative = await Linking.canOpenURL(nativeUrl);
      const target = canOpenNative ? nativeUrl : webUrl;
      await Linking.openURL(target);

      return {
        ok: true,
        message: query
          ? `Opening Maps for "${query}".`
          : "Opening Google Maps.",
      };
    } catch (e: any) {
      return { ok: false, message: `Couldn't open Maps: ${e?.message ?? e}` };
    }
  },
};

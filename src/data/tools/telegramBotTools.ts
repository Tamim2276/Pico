import type { Tool, ToolResult } from "@domain/services/tools/Tool";

/**
 * Simple Telegram debug tool: fetches getUpdates JSON and logs it to console.
 * Uses dummy token from .env for now (EXPO_PUBLIC_TELEGRAM_BOT_TOKEN).
 */
export const telegramBotTools: Tool = {
  name: "telegram_updates",
  description: "Fetch latest Telegram bot updates and log raw JSON to console.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (): Promise<ToolResult> => {
    const token = process.env.EXPO_PUBLIC_TELEGRAM_BOT_TOKEN;
    if (!token) {
      return { ok: false, message: "Missing EXPO_PUBLIC_TELEGRAM_BOT_TOKEN in .env" };
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=10`);
      const json = await res.json();
      console.log(JSON.stringify(json, null, 2));

      const count = json?.result?.length ?? 0;
      return {
        ok: true,
        message: `Got ${count} Telegram update(s). Full JSON in console.`,
        data: json,
      };
    } catch (e: any) {
      return { ok: false, message: `Telegram fetch failed: ${e?.message ?? e}` };
    }
  },
};

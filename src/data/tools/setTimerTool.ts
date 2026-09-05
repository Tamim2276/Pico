import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import * as Notifications from "expo-notifications";

function parseDurationSeconds(input?: string | number): number {
  if (typeof input === "number") return input > 0 ? input : 60;
  if (!input) return 60;

  const text = String(input).toLowerCase().trim();

  // "10 minutes", "15 mins", "1 min"
  const minMatch = text.match(/(\d+)\s*(?:min|minute|m\b)/i);
  // "30 seconds", "45 sec", "10s"
  const secMatch = text.match(/(\d+)\s*(?:sec|second|s\b)/i);
  // "1 hour", "2 hrs"
  const hrMatch = text.match(/(\d+)\s*(?:hour|hr|h\b)/i);

  let total = 0;
  if (hrMatch) total += parseInt(hrMatch[1], 10) * 3600;
  if (minMatch) total += parseInt(minMatch[1], 10) * 60;
  if (secMatch) total += parseInt(secMatch[1], 10);

  if (total > 0) return total;

  // Standalone number e.g. "10"
  const numMatch = text.match(/^(\d+)$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    return n <= 60 ? n * 60 : n;
  }

  return 60; // 1 minute fallback
}

export const setTimerTool: Tool = {
  name: "set_timer",
  description: "Set a countdown timer or reminder alert.",
  parameters: {
    type: "object",
    properties: {
      duration: { type: "string", description: "Duration string (e.g. '15 minutes', '30 seconds', '1 hour')." },
      label: { type: "string", description: "Optional name or purpose for the timer (e.g. 'Pasta', 'Study')." },
    },
    required: ["duration"],
  },
  execute: async (args: { duration?: string | number; label?: string }): Promise<ToolResult> => {
    const seconds = parseDurationSeconds(args.duration);
    const label = (args.label || "").trim();

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        return {
          ok: false,
          message: "Notification permissions are required to set timers.",
        };
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ Timer Finished!`,
          body: label ? `Your timer for "${label}" is up!` : "Your timer has ended!",
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });

      const mins = Math.floor(seconds / 60);
      const remSecs = seconds % 60;
      let durationStr = "";
      if (mins > 0 && remSecs > 0) durationStr = `${mins}m ${remSecs}s`;
      else if (mins > 0) durationStr = `${mins} minute${mins > 1 ? "s" : ""}`;
      else durationStr = `${remSecs} second${remSecs > 1 ? "s" : ""}`;

      const titlePart = label ? ` for "${label}"` : "";
      return {
        ok: true,
        message: `⏱️ Timer set${titlePart} for ${durationStr}!\nI'll ring when time is up.`,
        data: { seconds, label },
      };
    } catch (e: any) {
      return { ok: false, message: `Failed to set timer: ${e?.message ?? e}` };
    }
  },
};

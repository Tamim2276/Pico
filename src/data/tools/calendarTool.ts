import * as Calendar from "expo-calendar";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";

const DAYS_AHEAD = 7;
const MAX_SHOWN = 5;

/**
 * Reads events from every event-calendar on the device for the next 7 days.
 * Uses the SDK 54 expo-calendar API (getCalendarsAsync / getEventsAsync).
 */
export const calendarTool: Tool = {
  name: "read_calendar",
  description: "List the user's calendar events for the next 7 days.",
  parameters: { type: "object", properties: {} },
  execute: async (): Promise<ToolResult> => {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      return { ok: false, message: "I need calendar access to read your events." };
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (calendars.length === 0) {
      return { ok: true, message: "No calendars are set up on this device." };
    }

    const now = new Date();
    const end = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
    const events = await Calendar.getEventsAsync(
      calendars.map((c) => c.id),
      now,
      end
    );

    if (events.length === 0) {
      return { ok: true, message: `No events in the next ${DAYS_AHEAD} days.` };
    }

    const sorted = [...events].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const lines = sorted.slice(0, MAX_SHOWN).map((e) => {
      const when = new Date(e.startDate).toLocaleString([], {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      return `• ${e.title || "(untitled)"} — ${when}`;
    });

    const more = sorted.length > MAX_SHOWN ? `\n…and ${sorted.length - MAX_SHOWN} more.` : "";

    return {
      ok: true,
      message: `Next ${DAYS_AHEAD} days:\n${lines.join("\n")}${more}`,
      data: sorted,
    };
  },
};

import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalEventRepository } from "@data/local/LocalEventRepository";
import { CreateEventUseCase } from "@domain/usecases/event/CreateEventUseCase";
import { taskEventBus } from "@data/local/taskEvents";

const eventRepo = new LocalEventRepository();
const createEventUseCase = new CreateEventUseCase(eventRepo);

function parseFlexibleDateTime(input?: string): { startIso: string; endIso: string } {
  const now = new Date();
  let targetDate = new Date(now);

  if (!input) {
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(20, 0, 0, 0);
    const end = new Date(targetDate.getTime() + 60 * 60 * 1000);
    return { startIso: targetDate.toISOString(), endIso: end.toISOString() };
  }

  // 1. Direct valid ISO or Date string
  const directDate = new Date(input);
  if (!isNaN(directDate.getTime())) {
    const end = new Date(directDate.getTime() + 60 * 60 * 1000);
    return { startIso: directDate.toISOString(), endIso: end.toISOString() };
  }

  // 2. Natural language parsing ("tomorrow", "today", "at 8:00 PM", "8 PM")
  const lower = input.toLowerCase();
  if (lower.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // Extract hours and minutes
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 8:00 PM if no specific time found
    targetDate.setHours(20, 0, 0, 0);
  }

  const endDate = new Date(targetDate.getTime() + 60 * 60 * 1000);
  return { startIso: targetDate.toISOString(), endIso: endDate.toISOString() };
}

export const createEventTool: Tool = {
  name: "create_event",
  description: "Schedule and create a new event in the user's calendar.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "The title or subject of the event." },
      startTime: { type: "string", description: "Start time (ISO string, date string, or e.g. 'Tomorrow at 8:00 PM')." },
      endTime: { type: "string", description: "End time (optional)." },
      location: { type: "string", description: "Optional event location." }
    },
    required: ["title"]
  },
  execute: async (args: { title?: string; startTime?: string; endTime?: string; location?: string }): Promise<ToolResult> => {
    const title = (args.title || "").trim();
    if (!title) {
      return { ok: false, message: "Event title is required." };
    }

    const { startIso, endIso } = parseFlexibleDateTime(args.startTime);

    try {
      const event = await createEventUseCase.execute(
        title,
        startIso,
        args.endTime || endIso,
        args.location
      );

      taskEventBus.emit();

      const startDate = new Date(startIso);
      const dateFormatted = startDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      const timeFormatted = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        ok: true,
        message: `📅 Scheduled event: "${event.title}" for ${dateFormatted} at ${timeFormatted}`,
        data: event,
      };
    } catch (e: any) {
      return { ok: false, message: `Failed to create event: ${e?.message ?? e}` };
    }
  }
};

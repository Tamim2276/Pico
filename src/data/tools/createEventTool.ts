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
    targetDate.setHours(targetDate.getHours() + 1, 0, 0, 0);
    const end = new Date(targetDate.getTime() + 60 * 60 * 1000);
    return { startIso: targetDate.toISOString(), endIso: end.toISOString() };
  }

  const lower = input.toLowerCase();

  // If input mentions "tomorrow", add 1 day
  if (lower.includes("tomorrow")) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  // 1. Check if input is a valid ISO/Date string
  const directDate = new Date(input);
  if (!isNaN(directDate.getTime())) {
    // If the LLM hallucinated a past year (e.g. 2024 instead of current year 2026)
    if (directDate.getFullYear() !== now.getFullYear()) {
      targetDate.setHours(directDate.getHours(), directDate.getMinutes(), 0, 0);
    } else {
      targetDate = directDate;
    }
    const end = new Date(targetDate.getTime() + 60 * 60 * 1000);
    return { startIso: targetDate.toISOString(), endIso: end.toISOString() };
  }

  // 2. Natural language time extraction ("10:00 AM", "8 PM", "15:30", etc.)
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    // Default to +1 hour from now
    targetDate.setHours(targetDate.getHours() + 1, 0, 0, 0);
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

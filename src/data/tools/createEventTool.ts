import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalEventRepository } from "@data/local/LocalEventRepository";
import { CreateEventUseCase } from "@domain/usecases/event/CreateEventUseCase";
import { taskEventBus } from "@data/local/taskEvents";

const eventRepo = new LocalEventRepository();
const createEventUseCase = new CreateEventUseCase(eventRepo);

const MONTH_INDEX: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7,
  sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/** Month-name dates like "13 september", "13th Sep", "Sep 13". */
function parseMonthDay(lower: string): { month: number; day: number } | null {
  let m = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\b/i
  );
  if (m) {
    return { day: parseInt(m[1], 10), month: MONTH_INDEX[m[2].toLowerCase()] };
  }
  m = lower.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i
  );
  if (m) {
    return { day: parseInt(m[2], 10), month: MONTH_INDEX[m[1].toLowerCase()] };
  }
  return null;
}

/**
 * Time extraction that ignores stray digits embedded in words (e.g. the "2"
 * in "SDP2"). Preference order: explicit meridiem ("8 am") > 24h colon
 * time ("15:30") > bare hour after a time preposition ("at 10").
 */
function extractTime(lower: string): { hours: number; minutes: number } | null {
  const valid = (h: number, min: number) =>
    Number.isInteger(h) && Number.isInteger(min) && h >= 0 && h <= 23 && min >= 0 && min <= 59
      ? { hours: h, minutes: min }
      : null;

  const meridiem = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (meridiem) {
    let hours = parseInt(meridiem[1], 10);
    const minutes = meridiem[2] ? parseInt(meridiem[2], 10) : 0;
    const isPm = meridiem[3].toLowerCase() === "pm";
    if (hours >= 1 && hours <= 12) {
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
      const v = valid(hours, minutes);
      if (v) return v;
    }
  }

  const colon = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colon) {
    const v = valid(parseInt(colon[1], 10), parseInt(colon[2], 10));
    if (v) return v;
  }

  const bare = lower.match(/\b(?:at|by|from|around|@)\s+(\d{1,2})\b/i);
  if (bare) {
    const v = valid(parseInt(bare[1], 10), 0);
    if (v) return v;
  }

  return null;
}

export function parseFlexibleDateTime(input?: string): { startIso: string; endIso: string } {
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

  // Month-name dates ("13 september", "Sep 13") are handled explicitly below,
  // so V8's lenient Date parser (which reads "at 10" as Oct 2001, for example)
  // must only run on inputs that actually look like full dates.
  const monthDay = parseMonthDay(lower);
  if (monthDay && monthDay.day >= 1 && monthDay.day <= 31) {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    let candidate = new Date(
      now.getFullYear(),
      monthDay.month,
      monthDay.day,
      0, 0, 0, 0
    );
    if (candidate.getTime() < startOfToday.getTime()) {
      candidate = new Date(
        now.getFullYear() + 1,
        monthDay.month,
        monthDay.day,
        0, 0, 0, 0
      );
    }
    targetDate = candidate;
  }

  // 1. Check if input is a valid ISO/Date string — but only when it carries
  // an explicit year. Otherwise V8 hallucinates (e.g. "lunch at 10" -> Oct 2001)
  // and the explicit parsers below do a better job.
  const directDate =
    /\d{4}/.test(input) && !isNaN(new Date(input).getTime())
      ? new Date(input)
      : new Date(NaN);
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

  // 2. Natural language time extraction ("10:00 AM", "8 PM", "15:30", "at 10").
  // Stray digits inside words (e.g. "SDP2") are never treated as times.
  const parsedTime = extractTime(lower);
  if (parsedTime) {
    targetDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
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

import type { ToolResult } from "@domain/services/tools/Tool";
import { getTool } from "@data/tools/registry";

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

/**
 * Execute a tool by name. This is what you call once you KNOW which tool to
 * run — whether the name came from the keyword matcher below or, later, from
 * Gemma's tool-call output.
 */
export async function runTool(
  name: string,
  args: Record<string, any> = {}
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) return { ok: false, message: `Unknown tool: ${name}` };
  try {
    return await tool.execute(args);
  } catch (e: any) {
    return { ok: false, message: `"${name}" failed: ${e?.message ?? e}` };
  }
}

/**
 * ── Layer 1 Zero-Latency Fast-Path Intent Router ───────────────────────────
 * Matches high-confidence common intents using a Verb-Noun matrix before
 * triggering on-device SLM inference. Returns null when query requires reasoning.
 */
export function matchIntent(text: string): ToolCall | null {
  const t = text.toLowerCase().trim();

  // 1. Flashlight / Torch
  if (/\b(flash\s?light|torch|lamp)\b/.test(t) || /\b(light)\b/.test(t)) {
    if (/\b(turn\s*off|switch\s*off|disable|kill|stop|shut\s*off|douse|off)\b/.test(t)) {
      return { name: "toggle_flashlight", args: { state: "off" } };
    }
    if (/\b(turn\s*on|switch\s*on|enable|start|ignite|bright|on)\b/.test(t)) {
      return { name: "toggle_flashlight", args: { state: "on" } };
    }
  }

  // 2. Battery Status
  if (/\b(battery|juice|charge|power level|battery percentage)\b/.test(t)) {
    if (/\b(how much|what|check|status|level|remaining|is my phone)\b/.test(t) || t === "battery" || t === "battery status") {
      return { name: "battery_status", args: {} };
    }
  }

  // 3. Read Tasks List
  if (/\b(tasks|todo|todos|to-do)\b/.test(t)) {
    if (/\b(show|list|what|my|check|read|view|get)\b/.test(t) || t === "my tasks" || t === "tasks") {
      return { name: "read_tasks", args: {} };
    }
  }

  // 4. Read Calendar
  if (/\b(events|schedule|calendar|agenda|meetings)\b/.test(t)) {
    if (/\b(show|list|what|my|check|read|view|upcoming)\b/.test(t) || t === "my calendar" || t === "upcoming events") {
      return { name: "read_calendar", args: {} };
    }
  }

  // 5. Location
  if (/\b(where am i|my location|current location|gps coordinates)\b/.test(t)) {
    return { name: "current_location", args: {} };
  }

  // 6. Daily Briefing / Morning Briefing
  if (
    /\b(daily briefing|morning briefing|brief me|day briefing|summarize my day|what does my day look like|how is my day)\b/.test(t) ||
    t === "briefing" ||
    t === "good morning" ||
    t === "daily summary"
  ) {
    return { name: "daily_briefing", args: {} };
  }

  // 7. Complete Task Fast-Path
  if (/\b(mark|complete|done|finish)\b/.test(t) && /\b(task|todo|as done|as completed)\b/.test(t)) {
    const cleaned = t
      .replace(/\b(mark|complete|done|finish|as done|as completed|task|the|my|please)\b/gi, "")
      .trim();
    if (cleaned) {
      return { name: "mark_task_completed", args: { title: cleaned } };
    }
  }

  return null;
}

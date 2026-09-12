/**
 * Plan My Day skill: builds a personalized day plan in 2 LLM calls.
 *
 * 1. Planner call — looks at the available tool list + a snapshot of the
 *    user's tasks/events and decides which tools to call (JSON array).
 * 2. Executes those tools via runTool (never throws — internet-dependent
 *    tools report { ok: false } offline and the plan notes the gaps).
 * 3. Synthesizer call — turns the snapshot + tool results into a short plan.
 *
 * Routing (both LLM calls): Nemotron cloud first, on-device LLM fallback
 * when offline / key missing / cloud fails. If both LLMs fail, falls back
 * to the deterministic daily_briefing tool (no LLM needed).
 */

import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { LocalEventRepository } from "@data/local/LocalEventRepository";
import { toolSpecs } from "@data/tools/registry";
import { runTool } from "@data/tools/dispatcher";
import { createLLMProvider } from "@shared/utils/llm";
import { nemotronChat } from "@data/cloud/nemotronChat";

const taskRepo = new LocalTaskRepository();
const eventRepo = new LocalEventRepository();

/** Planner may only pick read-only, side-effect-free tools. */
const PLANNER_ALLOWED = [
  "read_tasks",
  "read_calendar",
  "daily_briefing",
  "get_weather",
  "battery_status",
  "telegram_updates",
];

const DEFAULT_PLAN = ["read_tasks", "read_calendar", "get_weather"];
const MAX_TOOL_CALLS = 4;
const TOOL_OUTPUT_CHARS = 600;

/** Cloud first, on-device LLM fallback. Null when both fail. */
async function llmText(system: string, user: string): Promise<string | null> {
  try {
    const cloud = await nemotronChat(system, user, { maxTokens: 600 });
    if (cloud && cloud.trim()) return cloud;
  } catch {
    // fall through to local
  }
  try {
    const provider = createLLMProvider();
    const local = await provider.generate(`${system}\n\n${user}`);
    if (local && local.trim()) return local;
  } catch {
    return null;
  }
  return null;
}

function snapshotLine(): string {
  const now = new Date();
  return `Today is ${now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })}.`;
}

async function buildSnapshot(): Promise<string> {
  let tasks: any[] = [];
  let events: any[] = [];
  try {
    tasks = await taskRepo.getTasks();
  } catch {
    tasks = [];
  }
  try {
    events = await eventRepo.getEvents();
  } catch {
    events = [];
  }

  const pending = tasks.filter((t) => !t.completed).slice(0, 8);
  const pendingLines =
    pending.length > 0
      ? pending.map((t) => `- ${t.title} [${t.priority || "Medium"}]`).join("\n")
      : "- (no pending tasks)";

  const today = new Date();
  const todays = events
    .filter((e) => {
      const d = new Date(e.startTime);
      return (
        !isNaN(d.getTime()) &&
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    })
    .slice(0, 8);
  const eventLines =
    todays.length > 0
      ? todays
          .map((e) => {
            const d = new Date(e.startTime);
            const time = isNaN(d.getTime())
              ? ""
              : ` at ${d.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`;
            return `- ${e.title}${time}`;
          })
          .join("\n")
      : "- (no events today)";

  return `${snapshotLine()}\nPending tasks:\n${pendingLines}\nToday's events:\n${eventLines}`;
}

/** Parse the planner's reply into validated tool names. */
function parsePlanner(raw: string | null): string[] {
  if (!raw) return DEFAULT_PLAN;
  const match = raw.match(/\[[\s\S]*?\]/);
  if (match) {
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) {
        const names = arr
          .map((e) => (typeof e === "string" ? e : e?.name))
          .filter((n: unknown) => typeof n === "string" && PLANNER_ALLOWED.includes(n));
        if (names.length > 0) return [...new Set(names)].slice(0, MAX_TOOL_CALLS);
      }
    } catch {
      // fall through to mention-scan below
    }
  }
  const mentioned = PLANNER_ALLOWED.filter((n) => raw.includes(n));
  return mentioned.length > 0 ? mentioned.slice(0, MAX_TOOL_CALLS) : DEFAULT_PLAN;
}

export const planMyDayTool: Tool = {
  name: "plan_my_day",
  description:
    "Create a personalized day plan from the user's tasks, events, weather, and context.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute: async (): Promise<ToolResult> => {
    try {
      const snapshot = await buildSnapshot();

      // ── LLM call 1: planner picks tools ──────────────────────────
      const available = toolSpecs()
        .filter((t) => PLANNER_ALLOWED.includes(t.name))
        .map((t) => `- ${t.name}: ${t.description}`)
        .join("\n");
      const plannerSystem =
        "You are Pico's planner. Reply with ONLY a JSON array of tool calls.";
      const plannerUser = [
        "Available tools:",
        available,
        "",
        "User context:",
        snapshot,
        "",
        'Which tools should run to plan the user\'s day? Reply ONLY like [{"name":"read_tasks","args":{}}], max 4. Prefer read_tasks, read_calendar, get_weather. If unsure, reply [].',
      ].join("\n");

      const plannerRaw = await llmText(plannerSystem, plannerUser);
      const toolNames = parsePlanner(plannerRaw);

      // ── Execute chosen tools (failures kept as gaps) ─────────────
      const sections: string[] = [];
      for (const name of toolNames) {
        try {
          // telegram_updates skips its summary pass when nested here —
          // the skill does its own synthesis below.
          const result = await runTool(
            name,
            name === "telegram_updates" ? { summarize: false } : {}
          );
          const body = (result.message || "").slice(0, TOOL_OUTPUT_CHARS);
          sections.push(
            result.ok ? `[${name}]\n${body}` : `[${name}: UNAVAILABLE]\n${body}`
          );
        } catch (e: any) {
          sections.push(`[${name}: UNAVAILABLE]\n${e?.message ?? e}`);
        }
      }

      // ── LLM call 2: synthesize the plan ──────────────────────────
      const synthSystem =
        "You are Pico, a warm personal assistant. Write a short day plan as a bullet list, under 150 words.";
      const synthUser = [
        snapshot,
        "",
        " gathered info:",
        sections.join("\n\n"),
        "",
        "Write today's plan. Some info may be marked UNAVAILABLE (offline) — plan with what is there and note gaps in one line.",
      ].join("\n");

      const plan = await llmText(synthSystem, synthUser);
      if (plan && plan.trim()) {
        return { ok: true, message: plan.trim() };
      }

      // ── Deterministic fallback (no LLM needed) ───────────────────
      return await runTool("daily_briefing", {});
    } catch (e: any) {
      return { ok: false, message: `Could not plan your day: ${e?.message ?? e}` };
    }
  },
};

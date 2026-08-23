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
 * ── TEMPORARY rule-based intent parser ────────────────────────────────────
 * A stand-in so the flashlight works from plain text TODAY, before Gemma is
 * wired up. When you connect the LLM, replace calls to matchIntent() with the
 * model's structured tool-call, then runTool(call.name, call.args) as-is.
 *
 * Returns null when no tool matches (Pico should then answer normally / via LLM).
 */
export function matchIntent(text: string): ToolCall | null {
  const t = text.toLowerCase().trim();

  // flashlight / torch
  if (/\b(flash\s?light|torch|flashlight)\b/.test(t) || /\blight\b/.test(t)) {
    const wantsOff = /\b(off|disable|kill|stop|turn it off|switch off)\b/.test(t);
    return { name: "toggle_flashlight", args: { state: wantsOff ? "off" : "on" } };
  }

  return null;
}

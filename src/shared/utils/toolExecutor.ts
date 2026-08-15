import { runTool } from "@data/tools/dispatcher";

export type ParsedToolCall = {
  name: string;
  args: Record<string, any>;
};

const TOOL_ARG_MODE: Record<string, "none" | "flashlight"> = {
  toggle_flashlight: "flashlight",
  battery_status: "none",
  read_calendar: "none",
  current_location: "none",
  fire_notification: "none",
};

const extractFirstBalancedJsonObject = (text: string): string | null => {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
};

const normalizeArgsForTool = (
  name: string,
  args: Record<string, any>,
): Record<string, any> => {
  const mode = TOOL_ARG_MODE[name];

  // Gemma sometimes echoes parameter schema into args. Ignore that payload.
  const looksLikeSchema =
    typeof args.type === "string" ||
    typeof args.properties === "object" ||
    Array.isArray(args.required);

  if (!mode || mode === "none") return {};
  if (looksLikeSchema) return {};

  if (mode === "flashlight") {
    const state = args.state;
    if (state === "on" || state === "off") return { state };
    return {};
  }

  return {};
};

const extractJsonObject = (text: string): Record<string, any> | null => {
  if (!text) return null;

  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // fall through to plain text parse below
    }
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // Handle trailing garbage like an extra closing brace.
      const balanced = extractFirstBalancedJsonObject(trimmed);
      if (!balanced) return null;
      try {
        return JSON.parse(balanced);
      } catch {
        // ignore and return null
      }
    }
  }

  return null;
};

export const parseToolCallFromGemma = (raw: string): ParsedToolCall | null => {
  const cleaned = raw
    .replace(/<start_function_call>/gi, "")
    .replace(/<escape>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (!cleaned) return null;

  const parsed = extractJsonObject(cleaned);
  if (!parsed) return null;

  const name = typeof parsed.name === "string" ? parsed.name : "";
  if (!name) return null;

  const rawArgs = parsed.args && typeof parsed.args === "object" ? parsed.args : {};
  const args = normalizeArgsForTool(name, rawArgs);
  return { name, args };
};

export const executeToolCallFromGemma = async (
  raw: string,
): Promise<{ ok: boolean; message: string }> => {
  const toolCall = parseToolCallFromGemma(raw);
  if (!toolCall) {
    return { ok: false, message: "" };
  }

  const result = await runTool(toolCall.name, toolCall.args);
  return {
    ok: result.ok,
    message: result.message,
  };
};

import { runTool } from "@data/tools/dispatcher";

export type ParsedToolCall = {
  name: string;
  args: Record<string, any>;
};

const TOOL_ARG_MODE: Record<string, "none" | "flashlight" | "create_task" | "create_event"> = {
  toggle_flashlight: "flashlight",
  battery_status: "none",
  read_calendar: "none",
  current_location: "none",
  fire_notification: "none",
  create_task: "create_task",
  read_tasks: "none",
  create_event: "create_event",
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

  if (mode === "create_task") {
    let rawTitle = "";
    if (typeof args.title === "string" && args.title.trim()) rawTitle = args.title;
    else if (typeof args.task === "string" && args.task.trim()) rawTitle = args.task;
    else if (typeof args.name === "string" && args.name.trim()) rawTitle = args.name;
    else if (typeof args.description === "string" && args.description.trim()) rawTitle = args.description;
    else if (typeof args.content === "string" && args.content.trim()) rawTitle = args.content;
    else if (typeof args.todo === "string" && args.todo.trim()) rawTitle = args.todo;

    let priority: "High" | "Medium" | "Low" = "Medium";
    const rawPriority = String(args.priority || "").toLowerCase();
    if (rawPriority.includes("high")) priority = "High";
    else if (rawPriority.includes("low")) priority = "Low";

    return {
      title: rawTitle.trim(),
      priority,
      category: typeof args.category === "string" ? args.category : "General",
      dueDate: typeof args.dueDate === "string" ? args.dueDate : undefined,
    };
  }

  if (mode === "create_event") {
    let rawTitle = "";
    if (typeof args.title === "string" && args.title.trim()) rawTitle = args.title;
    else if (typeof args.name === "string" && args.name.trim()) rawTitle = args.name;
    else if (typeof args.event === "string" && args.event.trim()) rawTitle = args.event;
    else if (typeof args.description === "string" && args.description.trim()) rawTitle = args.description;

    return {
      title: rawTitle.trim(),
      startTime: args.startTime,
      endTime: args.endTime,
      location: args.location,
    };
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
  if (!raw) return null;

  const cleaned = raw
    .replace(/<start_function_call>/gi, "")
    .replace(/<escape>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (!cleaned) return null;

  let parsed = extractJsonObject(cleaned);
  
  if (!parsed) {
    // Robust regex fallback for small models that emit malformed JSON
    if (cleaned.includes('"create_task"')) {
      const titleMatch = cleaned.match(/"(?:title|description)"\s*:\s*"([^"]+)"/i);
      const priorityMatch = cleaned.match(/"priority"\s*:\s*(?:\[\s*)?"(High|Medium|Low)"/i);
      const categoryMatch = cleaned.match(/"category"\s*:\s*"([^"]+)"/i);
      if (titleMatch) {
        return {
          name: "create_task",
          args: {
            title: titleMatch[1],
            priority: (priorityMatch?.[1] as any) || "Medium",
            category: categoryMatch?.[1] || "General",
          },
        };
      }
    }
    if (cleaned.includes('"toggle_flashlight"')) {
      const stateMatch = cleaned.match(/"state"\s*:\s*"(on|off)"/i);
      return {
        name: "toggle_flashlight",
        args: { state: stateMatch ? stateMatch[1] : "on" },
      };
    }
    if (cleaned.includes('"read_tasks"')) {
      return { name: "read_tasks", args: {} };
    }
    if (cleaned.includes('"battery_status"')) {
      return { name: "battery_status", args: {} };
    }
    if (cleaned.includes('"read_calendar"')) {
      return { name: "read_calendar", args: {} };
    }
    if (cleaned.includes('"current_location"')) {
      return { name: "current_location", args: {} };
    }
    return null;
  }

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

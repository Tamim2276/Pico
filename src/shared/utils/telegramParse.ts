/**
 * Stages 2–3: pure Telegram-notice helpers (no network, no storage, no LLM).
 * - extractTelegramTexts: raw getUpdates JSON -> notice strings.
 * - decideTelegramAction: notice + pending tasks + 7-day events -> constrained
 *   decision the tool executes. Deterministic so the small on-device LLM
 *   never has to free-plan (it only ever emits `telegram_updates`).
 * - parseCloudPlanResponse: validate the cloud model's JSON against the live
 *   tool list (zod). Anything invalid -> null -> caller falls back.
 */

import { z } from "zod/v3";

export type TelegramDecision =
  | { action: "create_task"; title: string; priority: "High" | "Medium" | "Low" }
  // Caller fills startIso/endIso via parseFlexibleDateTime (declared here so
  // the shape stays stable if parsing moves into this module later).
  | {
      action: "create_event";
      title: string;
      startIso?: string;
      endIso?: string;
    }
  | {
      action: "update_event";
      targetId: string;
      hasDateTime: boolean;
      /** True only for explicit times/dates -> reschedule; else annotate. */
      reschedule: boolean;
      note?: string;
    }
  | { action: "ignore"; reason: string };

export interface TelegramMatchCandidate {
  id: string;
  title: string;
  startTime?: string;
}

export function extractTelegramTexts(json: unknown): string[] {
  const result = (json as { result?: unknown } | null | undefined)?.result;
  if (!Array.isArray(result)) return [];

  const seen = new Set<string>();
  const texts: string[] = [];

  for (const update of result) {
    if (!update || typeof update !== "object") continue;
    const message = (update as { message?: unknown }).message;
    if (!message || typeof message !== "object") continue;

    const { text, caption } = message as {
      text?: unknown;
      caption?: unknown;
    };
    const raw =
      typeof text === "string" ? text : typeof caption === "string" ? caption : "";
    const cleaned = raw.trim();
    if (!cleaned) continue;
    // Bot commands (e.g. /start) are control input, not notices.
    if (cleaned.startsWith("/")) continue;
    // Dedupe identical texts within the same batch.
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    texts.push(cleaned);
  }

  return texts;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "for", "on", "in", "at",
  "is", "are", "was", "were", "be", "been", "will", "shall", "has",
  "have", "had", "with", "from", "by", "as", "it", "this", "that",
]);

const CHANGE_KEYWORDS =
  /(cancel|postpon|reschedul|prepone|\bmov(e|ed|ing)\b|\bshift\b|new time|new date|\bchanged?\b|\bupdates?d?\b|\broutine\b|revised)/i;

const URGENT_KEYWORDS = /(exam|deadline|urgent|important|cancel|tomorrow|today)/i;

const TASK_KEYWORDS =
  /(exam|deadline|assignment|homework|submit|submission|pay|bring|prepare|reminder|notice|class|meeting|routine|test|quiz|project|registration|admit|result)/i;

const DATETIME_STRONG =
  /(\b\d{1,2}[:.]\d{2}\s*(am|pm)?\b|\b\d{1,2}\s*(am|pm)\b|\b\d{1,2}[-/]\d{1,2}([-/]\d{2,4})?)/i;

const DATETIME_WEAK =
  /(tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Best overlapping candidate by shared significant tokens, or null. */
function bestOverlap(
  text: string,
  candidates: TelegramMatchCandidate[]
): { candidate: TelegramMatchCandidate; shared: number } | null {
  const words = new Set(tokenize(text));
  if (words.size === 0) return null;

  let best: TelegramMatchCandidate | null = null;
  let bestShared = 0;
  for (const c of candidates) {
    const titleWords = new Set(tokenize(c.title));
    let shared = 0;
    for (const w of words) {
      if (titleWords.has(w)) shared++;
    }
    if (shared > bestShared) {
      bestShared = shared;
      best = c;
    }
  }
  if (!best || bestShared < 1) return null;
  // Single shared word must be distinctive (longer than 4 chars) to count.
  if (bestShared === 1) {
    const wordsArr = [...words];
    const titleSet = new Set(tokenize(best.title));
    const distinctive = wordsArr.some(
      (w) => w.length > 4 && titleSet.has(w)
    );
    if (!distinctive) return null;
  }
  return { candidate: best, shared: bestShared };
}

function clipTitle(text: string, max = 100): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > max
    ? `${singleLine.slice(0, max - 1).trim()}…`
    : singleLine;
}

/**
 * Decide what a single notice means given current context.
 * Order matters: existing-event updates win over creates, and anything
 * without an actionable signal is ignored (never write on ambiguity).
 */
export function decideTelegramAction(
  text: string,
  pendingTasks: TelegramMatchCandidate[],
  upcomingEvents: TelegramMatchCandidate[]
): TelegramDecision {
  const trimmed = text.trim();
  if (!trimmed) return { action: "ignore", reason: "empty text" };

  // Bare "today/tomorrow/Monday" alone is weak (chit-chat mentions days too):
  // it only counts as a date signal alongside a task/change keyword.
  // Explicit times and numeric dates always count.
  const hasDateTime =
    DATETIME_STRONG.test(trimmed) ||
    (DATETIME_WEAK.test(trimmed) &&
      (TASK_KEYWORDS.test(trimmed) || CHANGE_KEYWORDS.test(trimmed)));
  const isChange = CHANGE_KEYWORDS.test(trimmed);

  // 1. Notice amends something already on the calendar.
  if (isChange) {
    const match = bestOverlap(trimmed, upcomingEvents);
    if (match) {
      return {
        action: "update_event",
        targetId: match.candidate.id,
        hasDateTime,
        reschedule: DATETIME_STRONG.test(trimmed),
        note: clipTitle(trimmed),
      };
    }
  }

  // 2. Notice already tracked as a pending task -> don't duplicate.
  const taskMatch = bestOverlap(trimmed, pendingTasks);
  if (taskMatch && taskMatch.shared >= 2) {
    return { action: "ignore", reason: "already tracked as a task" };
  }

  const priority: "High" | "Medium" | "Low" = URGENT_KEYWORDS.test(trimmed)
    ? "High"
    : "Medium";

  // 3. Dated notice with no calendar match -> new calendar event.
  // (Caller fills startIso/endIso via parseFlexibleDateTime.)
  if (hasDateTime) {
    return { action: "create_event", title: clipTitle(trimmed) };
  }

  // 4. Actionable notice without a date -> task.
  if (TASK_KEYWORDS.test(trimmed)) {
    return { action: "create_task", title: clipTitle(trimmed), priority };
  }

  return { action: "ignore", reason: "no actionable signal" };
}

// ── Cloud-plan validation (zod) ────────────────────────────────────────────

export interface CloudToolCall {
  name: string;
  args: Record<string, unknown>;
}

/** One entry per notice, attributed by EXACT quote (never by position). */
export interface CloudDecision {
  /** Verbatim copy of the notice text this entry decides. */
  notice: string;
  calls: CloudToolCall[];
}

const CloudToolCallSchema = z.object({
  name: z.string().min(1),
  args: z.record(z.string(), z.unknown()).default({}),
});

const CloudDecisionSchema = z.object({
  notice: z.string().min(1),
  calls: z.array(CloudToolCallSchema).default([]),
});

const CloudPlanSchema = z.object({
  decisions: z.array(z.unknown()).default([]),
});

/** First balanced {...} in text, respecting string literals. */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Validate the cloud model's raw output. Returns one decision per notice
 * (missing entries possible), or null when the envelope itself is off so the
 * caller falls back to the deterministic decider for the whole batch.
 *
 * Tolerates one common model quirk: repeating the top-level "decisions" key
 * instead of emitting a single array. Those arrays are merged in order.
 */
export function parseCloudPlanResponse(
  raw: unknown,
  validNames: string[]
): (CloudDecision | null)[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  const occurrences = raw.match(/"decisions"\s*:/g) ?? [];
  if (occurrences.length > 1) {
    return parseMergedDecisions(raw, validNames);
  }

  let candidate: string | null = null;
  const fenced = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (fenced?.[1]) {
    candidate = fenced[1];
  } else {
    candidate = extractFirstJsonObject(raw);
  }
  if (!candidate) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  return validateDecisionsShape(parsed, validNames);
}

function validateDecisionsShape(
  parsed: unknown,
  validNames: string[]
): (CloudDecision | null)[] | null {
  const result = CloudPlanSchema.safeParse(parsed);
  if (!result.success) return null;

  const valid = new Set(validNames);
  return result.data.decisions.map((item) => {
    const normalized = normalizeDecisionEntry(item);
    if (!normalized) return null;
    const entry = CloudDecisionSchema.safeParse(normalized);
    if (!entry.success) return null;
    const rawCount = normalized.calls.length;
    const calls = entry.data.calls
      .filter((c) => valid.has(c.name))
      .slice(0, 4)
      .map((c) => ({ name: c.name, args: c.args }));
    // Entry listed calls but every name was invented -> fallback, not trust.
    if (rawCount > 0 && calls.length === 0) return null;
    // Datetime fields must obey the +06:00 ISO contract; otherwise the whole
    // entry falls back to deterministic (device-local) resolution.
    for (const c of calls) {
      for (const key of ["startTime", "endTime", "dueDate"] as const) {
        const value = (c.args as Record<string, unknown>)[key];
        if (value !== undefined && sanitizeCloudDateTime(value) === null) {
          return null;
        }
      }
    }
    return { notice: entry.data.notice, calls };
  });
}

/**
 * Cloud datetime contract: ISO with an explicit +06:00 (Asia/Dhaka) offset
 * inside a sanity window (yesterday .. ~13 months out). Returns the
 * normalized string, or null when the value must not be trusted.
 */
export function sanitizeCloudDateTime(
  value: unknown,
  nowMs: number = Date.now()
): string | null {
  if (typeof value !== "string") return null;
  let v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?([+-]\d{2}:?\d{2})$/.test(v)) {
    return null;
  }
  if (v.endsWith("+0600")) v = `${v.slice(0, -5)}+06:00`;
  if (!v.endsWith("+06:00")) return null;
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  if (t < nowMs - dayMs) return null;
  if (t > nowMs + 395 * dayMs) return null;
  return v;
}

/**
 * One raw decisions entry -> {notice, calls} shape, or null when it carries
 * no usable signal (garbage entry -> caller falls back for that notice).
 * Bare {name,args} calls can't be attributed to a notice -> null.
 */
function normalizeDecisionEntry(
  item: unknown
): { notice: unknown; calls: unknown[] } | null {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  if (typeof o.notice !== "string" || !o.notice.trim()) return null;
  if (!Array.isArray(o.calls)) return null;
  return { notice: o.notice, calls: o.calls };
}

/** Merge every `"decisions": [...]` array in document order, validate once. */
function parseMergedDecisions(
  raw: string,
  validNames: string[]
): (CloudDecision | null)[] | null {
  const arrays: string[] = [];
  const marker = /"decisions"\s*:/g;
  let m: RegExpExecArray | null;
  while ((m = marker.exec(raw)) !== null) {
    let i = m.index + m[0].length;
    while (i < raw.length && /\s/.test(raw[i] ?? "")) i += 1;
    if (raw[i] !== "[") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    const start = i;
    for (; i < raw.length; i += 1) {
      const ch = raw[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === "[") depth += 1;
      if (ch === "]") {
        depth -= 1;
        if (depth === 0) {
          arrays.push(raw.slice(start, i + 1));
          break;
        }
      }
    }
    marker.lastIndex = i;
  }
  if (arrays.length === 0) return null;

  const items: unknown[] = [];
  for (const a of arrays) {
    try {
      const parsed = JSON.parse(a);
      if (Array.isArray(parsed)) items.push(...parsed);
    } catch {
      return null;
    }
  }
  return validateDecisionsShape({ decisions: items }, validNames);
}

// ── Cloud prompt builder (pure; transport lives in telegramCloud.ts) ───────

export interface CloudPromptToolSpec {
  name: string;
  description: string;
  parameters: unknown;
}

export interface CloudPromptInput {
  todayLabel: string;
  texts: string[];
  pendingTasks: TelegramMatchCandidate[];
  upcomingEvents: TelegramMatchCandidate[];
  toolSpecs: CloudPromptToolSpec[];
}

export function buildCloudPrompt(input: CloudPromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are Pico's Telegram notice interpreter. Convert each notice into tool calls.",
    "Rules:",
    "- Use ONLY the exact tool names listed under Available tools, plus update_event described below.",
    "- targetId values must come from the Pending tasks / Upcoming events lists. Never invent ids.",
    "- A notice that reschedules, postpones, moves, or cancels something matching a listed event -> ONLY update_event with that targetId, no additional create_task. NEVER mark_task_completed for those.",
    "- ONE single top-level \"calls\" array covering all notices combined. Never repeat the \"calls\" key.",
    "- Copy date/time phrases VERBATIM from the notice (e.g. startTime: 'Friday 10am'). Never convert timezones, never emit ISO datetimes.",
    "- For create_task: only title, priority (High if exam/deadline/urgent else Medium), and dueDate (verbatim phrase or omit). Omit category unless the notice states one.",
    "- Mirror rule: every NEW calendar event must also be created as a task with the same title and dueDate equal to the event start.",
    "- Greetings, jokes, or messages with no task/event content (e.g. 'hi') -> no calls for that notice.",
    "- Never emit telegram_updates itself (no recursive syncs).",
    "Special tool (for listed events only): update_event {targetId: string, startTime?: string, note?: string}.",
    "Time rule: all times are Asia/Dhaka (UTC+6). Emit EVERY startTime/endTime/dueDate as ISO WITH the +06:00 offset, derived from the notice (e.g. notice 'moves to 14 September 10am' -> '2026-09-14T10:00:00+06:00'). Never Z, never UTC, never naive datetimes, never anything else. If the notice has no usable date, omit the field.",
    "Output shape: one entry PER NOTICE, in the same order. Each entry MUST quote its notice text EXACTLY in the notice field (copy it character-for-character). An entry with empty calls [] means that notice needs nothing. Unquoted or missing notices are processed without you.",
    "ONE single top-level \"decisions\" array. Never repeat the \"decisions\" key.",
    "Examples:",
    'Notices: [1] "CSE 101 quiz moved to 18 September 10am" [2] "hi", events include {"id":"e9","title":"CSE 101 Quiz"} -> {"decisions":[{"notice":"CSE 101 quiz moved to 18 September 10am","calls":[{"name":"update_event","args":{"targetId":"e9","startTime":"2026-09-18T10:00:00+06:00"}}]},{"notice":"hi","calls":[]}]}',
    'Notices: [1] "Science fair on 20 September at 9am, hall A" with no matching event -> {"decisions":[{"notice":"Science fair on 20 September at 9am, hall A","calls":[{"name":"create_event","args":{"title":"Science fair","startTime":"2026-09-20T09:00:00+06:00","location":"hall A"}},{"name":"create_task","args":{"title":"Science fair","priority":"Medium","dueDate":"2026-09-20T09:00:00+06:00"}}]}]}',
    'Reply with ONLY raw JSON, no prose, no fences.',
    `Available tools: ${JSON.stringify(input.toolSpecs)}`,
  ].join("\n");

  const user = [
    `Today: ${input.todayLabel}.`,
    `Pending tasks: ${JSON.stringify(
      input.pendingTasks.map((t) => ({ id: t.id, title: t.title }))
    )}`,
    `Upcoming 7-day events: ${JSON.stringify(
      input.upcomingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
      }))
    )}`,
    "Notices:",
    ...input.texts.map((t, i) => `[${i + 1}] ${t}`),
    "Decide each notice in order.",
  ].join("\n");

  return { system, user };
}

/**
 * Telegram-only cloud interpreter transport (NVIDIA NIM, OpenAI-compatible).
 * Plain fetch — no SDK dependency. Shape verified live against
 * `nvidia/nemotron-3.5-lightning-30b-a3b`:
 * - thinking MUST be off (`chat_template_kwargs.enable_thinking: false`),
 *   otherwise the model narrates its reasoning into the content.
 * - `response_format: json_object` is accepted.
 * - reasoning output (if any) arrives in `reasoning_content` and is ignored.
 *
 * Nothing here touches other tools: specs are passed in as data, and any
 * transport/parse failure returns null so the caller falls back to the
 * deterministic decider. Scope: telegram tool only.
 */

import Constants from "expo-constants";
import {
  buildCloudPrompt,
  parseCloudPlanResponse,
  type CloudPromptInput,
  type CloudDecision,
} from "@shared/utils/telegramParse";

export const NEMOTRON_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const CLOUD_TIMEOUT_MS = 25000;
const CLOUD_MAX_TOKENS = 800;
/** Cloud batch cap: larger batches fall back to deterministic per notice. */
export const CLOUD_MAX_NOTICES = 10;

/**
 * Telegram-scoped pseudo-tool: reschedules/annotates an already-listed
 * event. Interpreted by telegramBotTools itself (NOT via runTool, NOT in
 * the registry) so no other tool is touched.
 */
const UPDATE_EVENT_SPEC = {
  name: "update_event",
  description:
    "Reschedule or annotate an event from the Upcoming events list. Args: targetId (required, an id from the list), startTime (verbatim phrase, omit if none), note.",
  parameters: {
    type: "object",
    properties: {
      targetId: { type: "string", description: "Id from the Upcoming events list." },
      startTime: { type: "string", description: "New time, verbatim phrase from the notice." },
      note: { type: "string", description: "Notice text for the event description." },
    },
    required: ["targetId"],
  },
};

export function getNvidiaApiKey(): string {
  const extra = Constants.expoConfig?.extra as
    | { nvidiaApiKey?: unknown }
    | undefined;
  return typeof extra?.nvidiaApiKey === "string" ? extra.nvidiaApiKey : "";
}

/**
 * Ask the cloud model to convert notices into per-notice validated decisions.
 * Returns one decision per notice (possibly fewer than input), or null when
 * the key is missing, the request fails/times out, or the response doesn't
 * validate — caller must fall back deterministically (per notice without a
 * decision entry, or for the whole batch on null).
 */
export async function interpretNoticesWithCloud(
  input: CloudPromptInput
): Promise<(CloudDecision | null)[] | null> {
  const apiKey = getNvidiaApiKey();
  if (!apiKey) return null;
  if (input.texts.length === 0) return [];

  const toolSpecs = [...input.toolSpecs, UPDATE_EVENT_SPEC];
  const { system, user } = buildCloudPrompt({ ...input, toolSpecs });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);

  try {
    const res = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NEMOTRON_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0,
        max_tokens: CLOUD_MAX_TOKENS,
        stream: false,
        response_format: { type: "json_object" },
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.log(`[telegram_cloud] HTTP ${res.status}, falling back.`);
      return null;
    }

    const json = await res.json();
    const content: unknown = json?.choices?.[0]?.message?.content;
    console.log(
      "[telegram_cloud] raw:",
      typeof content === "string" ? content.slice(0, 3000) : content
    );
    const decisions = parseCloudPlanResponse(
      content,
      toolSpecs.map((t) => t.name)
    );
    console.log("[telegram_cloud] validated:", JSON.stringify(decisions));
    return decisions;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

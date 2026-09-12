/**
 * Shared NVIDIA NIM (Nemotron, OpenAI-compatible) chat transport.
 * Plain fetch — no SDK dependency. Shape verified live against
 * `nvidia/nemotron-3.5-lightning-30b-a3b` (see telegramCloud.ts):
 * - thinking MUST stay off (`chat_template_kwargs.enable_thinking: false`),
 *   otherwise the model narrates its reasoning into the content.
 *
 * Any failure (missing key, timeout, HTTP error, bad shape) resolves to
 * null so the caller falls back to the on-device LLM or a deterministic
 * path. Never throws for transport-level problems.
 */

import { getNvidiaApiKey } from "@data/tools/telegramCloud";

export const NEMOTRON_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";
const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const CLOUD_TIMEOUT_MS = 25000;

interface NemotronOptions {
  /** default 600 */
  maxTokens?: number;
  /** default 0.3 */
  temperature?: number;
  /** default false — set true when the caller needs strict JSON back */
  json?: boolean;
}

export async function nemotronChat(
  system: string,
  user: string,
  opts: NemotronOptions = {}
): Promise<string | null> {
  const apiKey = getNvidiaApiKey();
  if (!apiKey) return null;

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
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 600,
        stream: false,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.log(`[nemotron] HTTP ${res.status}, falling back.`);
      return null;
    }

    const json = await res.json();
    const content: unknown = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    return content;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

import { createLLMProvider } from "@shared/utils/llm";

/**
 * Asks the on-device model whether a task is an outdoor / weather-sensitive
 * activity. Returns:
 *   true  -> outdoors, weather matters
 *   false -> indoors, weather doesn't matter
 *   null  -> couldn't decide (model unavailable or unclear) → caller skips this
 *            cycle and retries later, WITHOUT caching a guess.
 *
 * This is deliberately a tight yes/no — the one thing a 1B model handles well.
 * The caller caches the result so we don't re-ask about the same event.
 */
export async function askIsOutdoor(
  title: string,
  location: string
): Promise<boolean | null> {
  const prompt =
    `Decide if a calendar task is an OUTDOOR activity that bad weather ` +
    `(rain, storm, heat, cold, wind) could disrupt.\n` +
    `Task title: "${title}"\n` +
    `Location: "${location || "unknown"}"\n` +
    `Answer with exactly one word: YES or NO.`;

  try {
    const provider = createLLMProvider();
    const raw = (await provider.generate(prompt)).trim().toUpperCase();

    const hasYes = raw.includes("YES");
    const hasNo = raw.includes("NO");

    if (hasYes && !hasNo) return true;
    if (hasNo && !hasYes) return false;
    // Starts-with wins ties like "NO, this is indoors"
    if (raw.startsWith("YES")) return true;
    if (raw.startsWith("NO")) return false;
    return null; // unclear → don't guess
  } catch {
    return null; // model not ready this cycle
  }
}

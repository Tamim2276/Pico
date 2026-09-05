import * as Location from "expo-location";
import { createLLMProvider } from "@shared/utils/llm";
import {
  ensureCalendarPermission,
  fetchEvents,
} from "@data/calendar/deviceCalendar";
import {
  fetchHourlyForecast,
  findHour,
  evaluateWeather,
  HourWeather,
} from "@data/weather/weather";
import { askIsOutdoor } from "@data/monitoring/weatherFlag";

/**
 * The chat "front door". The on-device model NEVER answers weather/task
 * questions from its own head (that's what hallucinated). Instead we detect
 * intent, run real code against real data, and only use the model to extract
 * a task's title/details. Everything else falls back to normal chat.
 */
export type AssistantAction =
  | { type: "text"; text: string }
  | { type: "open_add_task"; title: string; details: string }
  | { type: "fallback" }; // not one of our intents → let existing chat handle it

type Intent = "weather" | "reschedule" | "add_task" | "none";

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();

  // Reschedule first — it may mention both weather and tasks.
  if (
    /\breschedul/.test(t) ||
    /\bsuggestion/.test(t) ||
    /(weather).*(task|today|plan|affect)/.test(t) ||
    /(task|today|plan).*(affect|weather)/.test(t)
  ) {
    return "reschedule";
  }

  // Add task / event / reminder.
  if (
    /\b(add|create|new|make|set up|put|schedule)\b[\s\S]*\b(task|event|reminder|appointment|meeting)\b/.test(t) ||
    /\b(add|put|schedule|save)\b[\s\S]*\bcalendar\b/.test(t) ||
    /\bremind me to\b/.test(t)
  ) {
    return "add_task";
  }

  // Weather.
  if (
    /\b(weather|forecast|rain|raining|temperature|how hot|how cold|humid|sunny|cloudy|storm)\b/.test(t)
  ) {
    return "weather";
  }

  return "none";
}

async function getLatLon(): Promise<{ lat: number; lon: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  let pos = await Location.getLastKnownPositionAsync();
  if (!pos) {
    try {
      pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    } catch {
      return null;
    }
  }
  return pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;
}

function conditionText(code: number): string {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "mostly clear";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzly";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snowy";
  if ([95, 96, 99].includes(code)) return "stormy";
  return "changeable";
}

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric" });
}

/** Deterministic, natural-language weather report from real data. */
async function buildWeatherReport(): Promise<string> {
  const loc = await getLatLon();
  if (!loc) {
    return "I need location access to check the weather — you can turn it on in Settings.";
  }

  let forecast: HourWeather[];
  try {
    forecast = await fetchHourlyForecast(loc.lat, loc.lon);
  } catch {
    return "I couldn't reach the weather service just now. Try again in a moment.";
  }
  if (forecast.length === 0) return "I couldn't get a forecast for your location right now.";

  const now = new Date();
  const current = findHour(forecast, now) ?? forecast[0];
  const idx = Math.max(0, forecast.findIndex((f) => f.time === current.time));
  const upcoming = forecast.slice(idx + 1, idx + 9); // next ~8 hours

  const parts: string[] = [];
  parts.push(
    `Right now it's ${Math.round(current.temperature)}°C (feels like ${Math.round(
      current.apparentTemperature
    )}°C) and ${conditionText(current.weatherCode)}.`
  );

  const rain = upcoming.find(
    (h) =>
      h.precipitationProbability >= 50 ||
      [61, 63, 65, 80, 81, 82, 95, 96, 99].includes(h.weatherCode)
  );
  if (rain) {
    parts.push(
      `Rain looks likely around ${hourLabel(rain.time)} (${rain.precipitationProbability}% chance).`
    );
  } else {
    parts.push("No rain expected for the next several hours.");
  }

  if (upcoming.length > 0) {
    const temps = upcoming.map((h) => h.apparentTemperature);
    const maxT = Math.max(...temps);
    const minT = Math.min(...temps);
    const cur = current.apparentTemperature;
    if (maxT - cur >= 3) parts.push(`It'll warm to about ${Math.round(maxT)}°C later.`);
    else if (cur - minT >= 3) parts.push(`It'll cool to about ${Math.round(minT)}°C later.`);
  }

  const storm = upcoming.find((h) => [95, 96, 99].includes(h.weatherCode));
  if (storm) parts.push(`Heads up — thunderstorms are possible around ${hourLabel(storm.time)}.`);

  return parts.join(" ");
}

/** Check today's remaining tasks against the weather and report issues. */
async function buildRescheduleReport(): Promise<string> {
  if (!(await ensureCalendarPermission())) {
    return "I need calendar access to check your tasks for weather issues.";
  }

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const events = (await fetchEvents(now, endOfDay))
    .filter((e) => !e.allDay && (e.end ?? e.start).getTime() >= now.getTime())
    .slice(0, 8);
  if (events.length === 0) return "You have no more tasks scheduled for today.";

  const loc = await getLatLon();
  if (!loc) return "I need location access to compare your tasks against the weather.";

  let forecast: HourWeather[];
  try {
    forecast = await fetchHourlyForecast(loc.lat, loc.lon);
  } catch {
    return "I couldn't reach the weather service to check your tasks right now.";
  }

  const issues: { title: string; time: string; reason: string }[] = [];
  let outdoorCount = 0;

  for (const e of events) {
    const outdoor = await askIsOutdoor(e.title, e.location);
    if (outdoor !== true) continue;
    outdoorCount += 1;

    const hour = findHour(forecast, e.start);
    if (!hour) continue;

    const verdict = evaluateWeather(hour);
    if (verdict.bad) {
      issues.push({
        title: e.title,
        time: e.start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        reason: verdict.reason,
      });
    }
  }

  if (outdoorCount === 0) {
    return "None of today's remaining tasks look weather-sensitive, so nothing to reschedule. 👍";
  }
  if (issues.length === 0) {
    return "Good news — your outdoor tasks today look clear of bad weather. No need to reschedule. ☀️";
  }

  const lines = issues.map((i) => `• "${i.title}" at ${i.time} — ${i.reason}`).join("\n");
  const head =
    issues.length === 1
      ? "One of today's tasks may run into weather:"
      : `${issues.length} of today's tasks may run into weather:`;
  return `${head}\n${lines}\n\nWant to move any of them to a better time?`;
}

/** Use the model ONLY to pull a title + details out of the sentence. */
async function extractTaskDraft(text: string): Promise<{ title: string; details: string }> {
  const prompt = [
    "Extract a calendar task from the user's message.",
    'Reply ONLY as JSON: {"title": "<short task name>", "details": "<extra details or empty>"}',
    "Do not put any date or time in the title.",
    `User: ${text}`,
  ].join("\n");

  try {
    const raw = await createLLMProvider().generate(prompt);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
      const details = typeof parsed.details === "string" ? parsed.details.trim() : "";
      if (title) return { title, details };
    }
  } catch {
    /* fall through to heuristic */
  }

  const fallback = text
    .replace(/^(add|create|new|schedule|set up|put|remind me to)\b/i, "")
    .replace(/\bto (my )?calendar\b/i, "")
    .trim();
  return { title: fallback || "New task", details: "" };
}

/** Entry point used by the chat screen. */
export async function handleUserMessage(text: string): Promise<AssistantAction> {
  const intent = detectIntent(text);

  if (intent === "weather") {
    return { type: "text", text: await buildWeatherReport() };
  }
  if (intent === "reschedule") {
    return { type: "text", text: await buildRescheduleReport() };
  }
  if (intent === "add_task") {
    const draft = await extractTaskDraft(text);
    return { type: "open_add_task", title: draft.title, details: draft.details };
  }
  return { type: "fallback" };
}

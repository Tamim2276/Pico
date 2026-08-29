import * as Location from "expo-location";
import * as Notifications from "expo-notifications";

import {
  ensureCalendarPermission,
  fetchEvents,
  DeviceEvent,
} from "@data/calendar/deviceCalendar";
import {
  fetchHourlyForecast,
  findHour,
  evaluateWeather,
} from "@data/weather/weather";
import { askIsOutdoor } from "@data/monitoring/weatherFlag";
import {
  loadStore,
  saveStore,
  pruneNotified,
  dayString,
} from "@data/monitoring/monitorStore";

export interface CheckResult {
  checked: number;
  flagged: number;
  conflicts: number;
  reason?: string;
}

interface Conflict {
  event: DeviceEvent;
  reason: string;
  notifyKey: string;
}

async function getLocation(): Promise<{ lat: number; lon: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;

  // Last-known avoids needing background-location permission.
  let pos = await Location.getLastKnownPositionAsync();
  if (!pos) {
    try {
      pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
    } catch {
      return null;
    }
  }
  return pos ? { lat: pos.coords.latitude, lon: pos.coords.longitude } : null;
}

async function notifyWeather(conflicts: Conflict[]): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return false;

  const first = conflicts[0];
  const body =
    conflicts.length === 1
      ? `"${first.event.title}" may be affected: ${first.reason}. Reschedule?`
      : `${conflicts.length} tasks today may be affected by weather. Review?`;

  await Notifications.scheduleNotificationAsync({
    content: { title: "Weather may affect your plans", body, sound: true },
    trigger: null, // present now
  });
  return true;
}

/**
 * The whole weather-reschedule check. Safe to call from the background task
 * or from the foreground ("check now"). Deterministic except for the per-event
 * outdoor flag, which the LLM decides once and we cache.
 */
export async function runWeatherCheck(): Promise<CheckResult> {
  const empty: CheckResult = { checked: 0, flagged: 0, conflicts: 0 };

  if (!(await ensureCalendarPermission())) {
    return { ...empty, reason: "no calendar permission" };
  }

  // Today's remaining, timed events.
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const events = (await fetchEvents(now, endOfDay)).filter(
    (e) => !e.allDay && (e.end ?? e.start).getTime() >= now.getTime()
  );
  if (events.length === 0) return { ...empty, reason: "no upcoming events today" };

  const loc = await getLocation();
  if (!loc) return { ...empty, reason: "no location" };

  let forecast;
  try {
    forecast = await fetchHourlyForecast(loc.lat, loc.lon);
  } catch {
    return { ...empty, reason: "weather fetch failed" };
  }
  if (forecast.length === 0) return { ...empty, reason: "empty forecast" };

  const store = await loadStore();
  const today = dayString(now);
  pruneNotified(store, today);

  let flagged = 0;
  const conflicts: Conflict[] = [];

  for (const event of events) {
    // Outdoor flag: cached, else ask the LLM once.
    let isOutdoor = store.flags[event.id];
    if (isOutdoor === undefined) {
      const asked = await askIsOutdoor(event.title, event.location);
      if (asked === null) continue; // unclear this cycle; retry later, no cache
      isOutdoor = asked;
      store.flags[event.id] = asked;
    }
    if (!isOutdoor) continue;
    flagged += 1;

    const hour = findHour(forecast, event.start);
    if (!hour) continue;

    const verdict = evaluateWeather(hour);
    if (!verdict.bad) continue;

    const notifyKey = `${event.id}:${today}`;
    if (store.notified[notifyKey]) continue; // already told them today
    conflicts.push({ event, reason: verdict.reason, notifyKey });
  }

  if (conflicts.length > 0) {
    const sent = await notifyWeather(conflicts);
    if (sent) conflicts.forEach((c) => (store.notified[c.notifyKey] = true));
  }

  await saveStore(store);

  return { checked: events.length, flagged, conflicts: conflicts.length };
}

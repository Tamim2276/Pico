import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  DeviceEvent,
  ensureCalendarPermission,
  fetchEvents,
} from "@data/calendar/deviceCalendar";

export type NotificationPermissionState = "unknown" | "granted" | "denied";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Single source of truth for what counts as a "notification".
 * Mirrors NotificationsScreen: device-calendar events from now -> +7 days.
 * Expo Calendar v54: requestCalendarPermissionsAsync -> getCalendarsAsync(EVENT)
 * -> getEventsAsync(ids, start, end).
 */
export async function fetchUpcomingNotifications(): Promise<DeviceEvent[]> {
  const granted = await ensureCalendarPermission();
  if (!granted) return [];
  const now = new Date();
  const in7 = new Date(now.getTime() + SEVEN_DAYS_MS);
  try {
    const events = await fetchEvents(now, in7);
    return events.filter((e) => (e.end ?? e.start).getTime() >= now.getTime());
  } catch {
    return [];
  }
}

export async function fetchUpcomingNotificationCount(): Promise<number> {
  const items = await fetchUpcomingNotifications();
  return items.length;
}

/**
 * Badge data for the home bell. Returns 0 while loading / denied / error,
 * so the badge hides instead of showing a stale task count.
 * Refreshes every time the screen gains focus.
 */
export function useUpcomingNotificationCount() {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setCount(await fetchUpcomingNotificationCount());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setIsLoading(true);
        try {
          const next = await fetchUpcomingNotificationCount();
          if (active) setCount(next);
        } finally {
          if (active) setIsLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  return { count, isLoading, refresh };
}

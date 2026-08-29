import { Linking, Platform } from "react-native";
import * as Calendar from "expo-calendar/legacy";

/** Normalised event shape used across Tasks / Calendar / Recent Activity. */
export interface DeviceEvent {
  id: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string;
  notes?: string;
  calendarId: string;
  color?: string;
}

export interface NewEventInput {
  title: string;
  start: Date;
  durationMinutes: number;
  notes?: string;
  location?: string;
}

/** Ask for calendar permission. Returns true if granted. */
export async function ensureCalendarPermission(): Promise<boolean> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  return status === "granted";
}

async function getCalendars(): Promise<Calendar.Calendar[]> {
  return Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
}

/** Read real events from every calendar between two dates. */
export async function fetchEvents(start: Date, end: Date): Promise<DeviceEvent[]> {
  const calendars = await getCalendars();
  if (calendars.length === 0) return [];

  const colorById: Record<string, string> = {};
  calendars.forEach((c) => {
    colorById[c.id] = c.color;
  });

  const raw = await Calendar.getEventsAsync(
    calendars.map((c) => c.id),
    start,
    end
  );

  return raw
    .map((e) => ({
      id: e.id,
      title: e.title || "(untitled)",
      start: new Date(e.startDate),
      end: e.endDate ? new Date(e.endDate) : null,
      allDay: !!e.allDay,
      location: e.location || "",
      notes: (e as any).notes || undefined,
      calendarId: e.calendarId,
      color: colorById[e.calendarId],
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Pick a calendar we're allowed to write to (prefer the primary one). */
async function getWritableCalendarId(): Promise<string | null> {
  const calendars = await getCalendars();
  const modifiable = calendars.filter((c) => c.allowsModifications);
  if (modifiable.length === 0) return null;

  const primary =
    modifiable.find((c) => (c as any).isPrimary) ??
    modifiable.find((c) => c.source && c.source.name !== "Other") ??
    modifiable[0];
  return primary.id;
}

function localTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** Create a real event on the device calendar. Returns the new event id. */
export async function createEvent(input: NewEventInput): Promise<string> {
  const calendarId = await getWritableCalendarId();
  if (!calendarId) {
    throw new Error("No writable calendar found on this device.");
  }

  const end = new Date(input.start.getTime() + input.durationMinutes * 60000);

  return Calendar.createEventAsync(calendarId, {
    title: input.title,
    startDate: input.start,
    endDate: end,
    notes: input.notes,
    location: input.location,
    timeZone: localTimeZone(),
  });
}

/** Deep-link into the phone's native Calendar app at a date. */
export async function openNativeCalendar(date: Date = new Date()): Promise<void> {
  const ms = date.getTime();
  try {
    if (Platform.OS === "ios") {
      await Linking.openURL(`calshow:${Math.floor(ms / 1000)}`);
    } else {
      await Linking.openURL(`content://com.android.calendar/time/${ms}`);
    }
  } catch {
    try {
      await Linking.openURL("content://com.android.calendar/time");
    } catch {
      /* no calendar app available */
    }
  }
}

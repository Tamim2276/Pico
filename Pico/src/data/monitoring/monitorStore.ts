import RNFS from "react-native-fs";

/**
 * Small persisted store so the background monitor:
 *  - only asks the LLM ONCE whether an event is outdoor (flags cache), and
 *  - notifies at most once per event per day (notified set).
 * A headless background task starts with a fresh JS context each run, so this
 * has to live on disk, not in memory.
 */

interface MonitorStore {
  flags: Record<string, boolean>; // eventId -> isOutdoor
  notified: Record<string, true>; // `${eventId}:${yyyy-mm-dd}` -> true
}

const FILE = `${RNFS.DocumentDirectoryPath}/pico_weather_monitor.json`;

export async function loadStore(): Promise<MonitorStore> {
  try {
    const raw = await RNFS.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      flags: parsed.flags ?? {},
      notified: parsed.notified ?? {},
    };
  } catch {
    return { flags: {}, notified: {} };
  }
}

export async function saveStore(store: MonitorStore): Promise<void> {
  try {
    await RNFS.writeFile(FILE, JSON.stringify(store), "utf8");
  } catch {
    /* best effort */
  }
}

/** Drop notified keys that aren't for `today` so the file doesn't grow forever. */
export function pruneNotified(store: MonitorStore, today: string): void {
  for (const key of Object.keys(store.notified)) {
    if (!key.endsWith(`:${today}`)) delete store.notified[key];
  }
}

export function dayString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

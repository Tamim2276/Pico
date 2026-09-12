import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalTaskRepository } from "@data/local/LocalTaskRepository";
import { LocalEventRepository } from "@data/local/LocalEventRepository";
import { LocalReminderRepository } from "@data/local/LocalReminderRepository";
import { taskEventBus } from "@data/local/taskEvents";

const TASKS_KEY = "PICO_TASKS";
const EVENTS_KEY = "PICO_EVENTS";
const REMINDERS_KEY = "PICO_REMINDERS";
const USERS_KEY = "PICO_LOCAL_USERS";
const SESSION_KEY = "PICO_CURRENT_SESSION";
const TELEGRAM_OFFSET_KEY = "TELEGRAM_LAST_UPDATE_ID";

const taskRepo = new LocalTaskRepository();
const eventRepo = new LocalEventRepository();
const reminderRepo = new LocalReminderRepository();

export interface PicoDataExport {
  exportedAt: string;
  tasks: unknown[];
  events: unknown[];
  reminders: unknown[];
}

/**
 * Reads everything Pico keeps on-device (tasks, events, reminders).
 * Auth users/passwords are never exported.
 */
export async function exportLocalData(): Promise<PicoDataExport> {
  const [tasks, events, reminders] = await Promise.all([
    taskRepo.getTasks(),
    eventRepo.getEvents(),
    reminderRepo.getReminders(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    tasks,
    events,
    reminders,
  };
}

/**
 * Erases all Pico local data, including accounts + session (logs out)
 * and the Telegram sync offset. Notifies task/event lists to refresh.
 * Expo SecureStore v54: deleteItemAsync(key) rejects on failure.
 */
export async function eraseAllLocalData(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TASKS_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(EVENTS_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(REMINDERS_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(USERS_KEY).catch(() => {}),
    SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {}),
    AsyncStorage.removeItem(TELEGRAM_OFFSET_KEY).catch(() => {}),
  ]);
  taskEventBus.emit();
}

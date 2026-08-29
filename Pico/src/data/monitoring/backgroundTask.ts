import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";
import { runWeatherCheck } from "@data/monitoring/weatherMonitor";

export const WEATHER_TASK = "pico-weather-monitor";

/**
 * Must be defined in the GLOBAL scope (module import), not inside a component,
 * so the OS can find it when it wakes the app. App.tsx imports this file.
 */
TaskManager.defineTask(WEATHER_TASK, async () => {
  try {
    const result = await runWeatherCheck();
    console.log("[weather-monitor] cycle:", JSON.stringify(result));
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.error("[weather-monitor] failed:", e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

/**
 * Register the periodic task. `minimumInterval` is in MINUTES and is only a
 * hint — Android runs it a few times a day at best, more when the app is used
 * regularly. That's why App also runs a check on foreground.
 */
export async function registerWeatherMonitor(): Promise<void> {
  try {
    const already = await TaskManager.isTaskRegisteredAsync(WEATHER_TASK);
    if (!already) {
      await BackgroundTask.registerTaskAsync(WEATHER_TASK, {
        minimumInterval: 30,
      });
      console.log("[weather-monitor] registered (~30 min).");
    }
  } catch (e) {
    console.warn("[weather-monitor] register failed:", e);
  }
}

export async function unregisterWeatherMonitor(): Promise<void> {
  try {
    await BackgroundTask.unregisterTaskAsync(WEATHER_TASK);
  } catch {
    /* ignore */
  }
}

/** Dev helper: force a run now (dev builds only). */
export async function triggerWeatherMonitorForTesting(): Promise<void> {
  try {
    await BackgroundTask.triggerTaskWorkerForTestingAsync();
  } catch (e) {
    console.warn("[weather-monitor] trigger-for-testing failed:", e);
  }
}

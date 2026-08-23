import * as Notifications from "expo-notifications";
import type { Tool, ToolResult } from "@domain/services/tools/Tool";
import { RESCHEDULE_CATEGORY } from "@data/notifications/rescheduleCategory";

/**
 * Fires an immediate local notification asking whether to reschedule, with
 * Yes/No action buttons (see rescheduleCategory.ts).
 *
 * `trigger: null` presents it right away. The global handler in App.tsx
 * (shouldShowBanner) makes it visible even while the app is foregrounded.
 */
export const notificationTool: Tool = {
  name: "fire_notification",
  description:
    "Send an immediate local reminder notification about rescheduling, " +
    "with Yes/No buttons.",
  parameters: { type: "object", properties: {} },
  execute: async (): Promise<ToolResult> => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      return { ok: false, message: "I need notification permission to send reminders." };
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Pico",
        body: "Do you want to reschedule?",
        sound: true,
        categoryIdentifier: RESCHEDULE_CATEGORY, // adds the Yes / No buttons
      },
      trigger: null, // present immediately
    });

    return {
      ok: true,
      message: "Reminder sent 🔔 — tap Yes or No on the notification.",
    };
  },
};

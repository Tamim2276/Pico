import * as Notifications from "expo-notifications";

/** categoryIdentifier attached to the reschedule notification */
export const RESCHEDULE_CATEGORY = "reschedule";

/** action identifiers returned in response.actionIdentifier */
export const RESCHEDULE_ACTIONS = {
  YES: "reschedule_yes",
  NO: "reschedule_no",
} as const;

/**
 * Registers the Yes/No buttons for the reschedule notification.
 * Must run once before the notification is scheduled — called from App.tsx.
 * Both buttons open the app to the foreground so Pico can react in the chat.
 */
export async function registerRescheduleCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(RESCHEDULE_CATEGORY, [
    {
      identifier: RESCHEDULE_ACTIONS.YES,
      buttonTitle: "Yes",
      options: { opensAppToForeground: true },
    },
    {
      identifier: RESCHEDULE_ACTIONS.NO,
      buttonTitle: "No",
      options: { opensAppToForeground: true },
    },
  ]);
}

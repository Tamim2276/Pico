import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import RootNavigator from "@presentation/navigation/RootNavigator";
import { ThemeProvider } from "@presentation/context/ThemeContext";
import { TorchProvider } from "@presentation/context/TorchProvider";
import {
  registerRescheduleCategory,
  RESCHEDULE_ACTIONS,
} from "@data/notifications/rescheduleCategory";
import { rescheduleBus } from "@data/notifications/rescheduleBus";

// How notifications behave while the app is in the foreground (SDK 54 shape).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  useEffect(() => {
    // Android requires a channel for local notifications to post reliably.
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    // Register the Yes/No buttons for the reschedule notification.
    registerRescheduleCategory();

    // Listen for taps on those buttons and forward the choice to the chat.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      if (action === RESCHEDULE_ACTIONS.YES) {
        rescheduleBus.emit("yes");
      } else if (action === RESCHEDULE_ACTIONS.NO) {
        rescheduleBus.emit("no");
      }
      // DEFAULT_ACTION_IDENTIFIER (tapping the body) just opens the app.
    });

    return () => sub.remove();
  }, []);

  return (
    <ThemeProvider>
      <TorchProvider>
        <RootNavigator />
      </TorchProvider>
    </ThemeProvider>
  );
}

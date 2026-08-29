# Pico — Native Tools

Device tools invoked from a hamburger menu (top-right of the Assistant screen).
No text parsing yet — buttons call tools directly. The `Tool` shape is
LLM-ready so Gemma tool-calling can drive the same tools later.

## Layout

```
src/
  domain/services/tools/Tool.ts        Tool interface (pure, no expo)
  data/
    device/torchStore.ts               observable torch state
    notifications/
      rescheduleCategory.ts            Yes/No buttons for the notification
      rescheduleBus.ts                 carries the Yes/No choice to the chat
    tools/
      flashlightTool.ts                expo-camera torch
      batteryTool.ts                   expo-battery
      calendarTool.ts                  expo-calendar (next 7 days)
      locationTool.ts                  expo-location (GPS)
      notificationTool.ts              expo-notifications (reschedule prompt)
      registry.ts                      the single list of tools + toolSpecs()
      dispatcher.ts                    runTool() + (future) matchIntent()
  presentation/
    context/TorchProvider.tsx          hidden CameraView driving the torch
    components/ToolMenu.tsx            the hamburger menu
```

## The tools

| Button               | Tool name           | Module            | Permission     |
|----------------------|---------------------|-------------------|----------------|
| Flashlight           | toggle_flashlight   | expo-camera       | camera         |
| Battery status       | battery_status      | expo-battery      | none           |
| Upcoming events      | read_calendar       | expo-calendar     | calendar       |
| My location          | current_location    | expo-location     | location       |
| Reschedule reminder  | fire_notification   | expo-notifications| notifications  |

## Reschedule flow

1. Tap "Reschedule reminder" → local notification: "Do you want to reschedule?"
   with **Yes / No** buttons.
2. Tapping a button opens the app and emits the choice on `rescheduleBus`.
3. `AssistantScreen` posts Pico's reply into the chat.

## Add a new tool

1. Create `src/data/tools/myTool.ts` implementing `Tool`.
2. Add it to the array in `registry.ts`.
3. Add a button entry in `ToolMenu.tsx` (`ACTIONS`).

## Wiring Gemma later

Feed `toolSpecs()` to the model as its available functions, parse its
tool-call, then `runTool(name, args)` — unchanged.

## Requires a development build

Torch (expo-camera) and notification action buttons don't work in Expo Go.
Run on a dev build (`expo-dev-client`) on a physical device.

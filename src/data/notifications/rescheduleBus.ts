/**
 * A tiny framework-free event bus carrying the user's reschedule choice.
 *
 * The notification response listener (registered in App.tsx) fires from
 * outside React and may run when the app was backgrounded. It emits the
 * choice here; AssistantScreen subscribes and posts Pico's reply into the
 * chat. Same decoupling pattern as torchStore.
 */

export type RescheduleChoice = "yes" | "no";

type Listener = (choice: RescheduleChoice) => void;

const listeners = new Set<Listener>();

export const rescheduleBus = {
  emit: (choice: RescheduleChoice): void => {
    listeners.forEach((l) => l(choice));
  },
  subscribe: (l: Listener): (() => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

/**
 * A tiny framework-free observable holding the desired torch state.
 *
 * Why this exists:
 *   - The flashlight TOOL (data layer) must not import React or expo-camera.
 *   - The actual torch is driven by a <CameraView> that lives in the
 *     presentation layer (TorchProvider).
 *   - This store is the seam between them: the tool writes `set(true)`,
 *     the provider subscribes and re-renders the CameraView.
 *
 * It's compatible with React's useSyncExternalStore (see TorchProvider).
 */

type Listener = (on: boolean) => void;

let torchOn = false;
const listeners = new Set<Listener>();

export const torchStore = {
  /** current desired state — getSnapshot for useSyncExternalStore */
  get: (): boolean => torchOn,

  /** flip the torch; notifies the provider which re-renders CameraView */
  set: (on: boolean): void => {
    if (torchOn === on) return;
    torchOn = on;
    listeners.forEach((l) => l(on));
  },

  toggle: (): void => torchStore.set(!torchOn),

  /** subscribe for useSyncExternalStore; returns an unsubscribe fn */
  subscribe: (l: Listener): (() => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

type Listener = () => void;
const listeners = new Set<Listener>();

export const taskEventBus = {
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  emit(): void {
    listeners.forEach(fn => {
      try {
        fn();
      } catch (err) {
        console.error("Error in task listener", err);
      }
    });
  },
};

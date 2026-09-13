/** One value the engine publishes for the interface to display, changing outside React's knowledge. */
export interface Signal<T> {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
}

/** Creates a signal, which notifies its subscribers only when the value it holds actually changes. */
export function signal<T>(initial: T): Signal<T> {
  let held = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => held,
    set: (value: T) => {
      if (Object.is(value, held)) return;
      held = value;
      for (const listener of [...listeners]) listener();
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

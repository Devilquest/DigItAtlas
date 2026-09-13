import { useSyncExternalStore } from 'react';

import type { Signal } from '../engine/signal';

/** Reads a signal in a component, so that a value changing at pointer speed re-renders only that one. */
export function useSignal<T>(source: Signal<T>): T {
  return useSyncExternalStore(source.subscribe, source.get, source.get);
}

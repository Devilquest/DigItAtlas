/** The stored preferences as React holds them, written back whenever they change. */
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { LayerMemory } from '../domain/layerMemory';
import { readPreferences, writePreferences } from './preferences';
import type { Preferences } from './preferences';

/** The preferences, the only way to change them, and what was said about the layers. */
export interface Stored {
  preferences: Preferences;
  update: (change: (was: Preferences) => Preferences) => void;
  memory: RefObject<LayerMemory>;
}

/** Holds the preferences for the visit, stored as they change and read back on the next one. */
export function usePreferences(): Stored {
  const [preferences, update] = useState(readPreferences);

  useEffect(() => writePreferences(preferences), [preferences]);

  // Read when a map is framed rather than during a render, so that loading one does not depend on the
  // preferences and reload every time they change.
  const memory = useRef(preferences.layers);
  useEffect(() => {
    memory.current = preferences.layers;
  }, [preferences.layers]);

  return { preferences, update, memory };
}

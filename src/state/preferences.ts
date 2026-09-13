/** The little the browser remembers between visits, under one key that carries its own version. */
import type { LayerMemory } from '../domain/layerMemory';

/** What a visitor chose that outlives the visit. */
export interface Preferences {
  panels: { levels: boolean; layers: boolean; minimap: boolean };
  open: string[];
  /** The layer groups whose children are hidden, which are open until one is closed. */
  collapsed: string[];
  layers: LayerMemory;
}

const KEY = 'digit-atlas';
const VERSION = 1;

const defaults = (): Preferences => ({
  panels: { levels: true, layers: true, minimap: true },
  open: [],
  collapsed: [],
  layers: {},
});

const keysOf = (held: unknown, fallback: string[]): string[] =>
  Array.isArray(held) ? held.filter((key) => typeof key === 'string') : fallback;

/** The statements that survive a read: anything else is dropped rather than trusted. */
function parseLayers(held: unknown, fallback: LayerMemory): LayerMemory {
  if (typeof held !== 'object' || held === null || Array.isArray(held)) return fallback;
  const memory: LayerMemory = {};
  for (const [key, said] of Object.entries(held as Record<string, unknown>)) {
    const one = said as Record<string, unknown> | null;
    if (typeof one?.on === 'boolean' && typeof one.at === 'number' && Number.isFinite(one.at)) {
      memory[key] = { on: one.on, at: one.at };
    }
  }
  return memory;
}

/** Reads one stored value, falling back to the defaults for anything missing, unreadable, or older. */
export function parsePreferences(raw: string | null): Preferences {
  const fallback = defaults();
  if (!raw) return fallback;
  let stored: unknown;
  try {
    stored = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (typeof stored !== 'object' || stored === null) return fallback;
  const held = stored as Record<string, unknown>;
  if (held.v !== VERSION) return fallback;

  const panels = held.panels as Record<string, unknown> | undefined;
  return {
    panels: {
      levels: typeof panels?.levels === 'boolean' ? panels.levels : fallback.panels.levels,
      layers: typeof panels?.layers === 'boolean' ? panels.layers : fallback.panels.layers,
      minimap: typeof panels?.minimap === 'boolean' ? panels.minimap : fallback.panels.minimap,
    },
    open: keysOf(held.open, fallback.open),
    collapsed: keysOf(held.collapsed, fallback.collapsed),
    layers: parseLayers(held.layers, fallback.layers),
  };
}

/** What one set of preferences is stored as, version and all. */
export function serializePreferences(preferences: Preferences): string {
  return JSON.stringify({ v: VERSION, ...preferences });
}

/** The stored preferences, or the defaults where the browser has none or will not give them. */
export function readPreferences(): Preferences {
  try {
    return parsePreferences(window.localStorage.getItem(KEY));
  } catch {
    return defaults();
  }
}

/** Stores preferences, doing nothing at all where the browser refuses to keep them. */
export function writePreferences(preferences: Preferences): void {
  try {
    window.localStorage.setItem(KEY, serializePreferences(preferences));
  } catch {}
}

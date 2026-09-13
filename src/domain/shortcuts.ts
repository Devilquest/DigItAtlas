/** What a keystroke means, decided without a browser, so the mapping is testable without one either. */

/** The panels a single letter toggles, all of them the same way: the key that opens one closes it. */
export type Panel = 'levels' | 'layers' | 'minimap';

/** The layer groups a single letter toggles whole, exactly as their own checkbox would. */
export type LayerGroupKey = 'base/collision' | 'enemies' | 'goodies';

export type ShortcutAction =
  | { kind: 'toggle-panel'; panel: Panel }
  | { kind: 'toggle-filters' }
  | { kind: 'toggle-layer-group'; key: LayerGroupKey }
  | { kind: 'fit' }
  | { kind: 'actual-size' }
  | { kind: 'toggle-goto' };

/** The parts of a `KeyboardEvent` a shortcut cares about, so the mapping needs no DOM to be tested. */
export interface KeyInput {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
}

/** The framing commands, which answer to their own key whether or not the modifier is held. */
function framing(code: string): ShortcutAction | null {
  if (code === 'Digit0' || code === 'Numpad0') return { kind: 'fit' };
  if (code === 'Digit1' || code === 'Numpad1') return { kind: 'actual-size' };
  return null;
}

/**
 * The action one keystroke names, or null where it names none.
 *
 * @param typing - Whether single-key shortcuts should be suspended because a field or dialog is active.
 */
export function resolveShortcut(input: KeyInput, typing: boolean): ShortcutAction | null {
  const framed = framing(input.code);

  if (input.ctrlKey || input.metaKey) {
    if (framed) return framed;
    return input.key.toLowerCase() === 'k' ? { kind: 'toggle-goto' } : null;
  }

  if (typing) return null;
  if (framed) return framed;

  switch (input.key.toLowerCase()) {
    case 'l':
      return { kind: 'toggle-panel', panel: 'levels' };
    case 'y':
      return { kind: 'toggle-panel', panel: 'layers' };
    case 'm':
      return { kind: 'toggle-panel', panel: 'minimap' };
    case 'f':
      return { kind: 'toggle-filters' };
    case 'c':
      return { kind: 'toggle-layer-group', key: 'base/collision' };
    case 'e':
      return { kind: 'toggle-layer-group', key: 'enemies' };
    case 'g':
      return { kind: 'toggle-layer-group', key: 'goodies' };
    default:
      return null;
  }
}

/** How the two modifier keys are written wherever one is named, dialog and tooltip alike. */
export const GO_TO_KEYS = 'Ctrl / Cmd + K';

/** The key each command answers to, held once because the bar, the shortcuts dialog and the guide name them. */
export const KEYS = {
  levels: 'L',
  layers: 'Y',
  minimap: 'M',
  filters: 'F',
  collision: 'C',
  enemies: 'E',
  goodies: 'G',
  fit: '0',
  actualSize: '1',
} as const;

/** One line of the keyboard shortcuts dialog: the keys as it writes them, and what they do. */
export interface ShortcutHelp {
  keys: string;
  does: string;
}

/** Every shortcut there is, in the words and the order the dialog lists them in. */
export const SHORTCUT_HELP: readonly ShortcutHelp[] = [
  { keys: GO_TO_KEYS, does: 'Open/close Go to map' },
  { keys: KEYS.levels, does: 'Show/hide the Levels panel' },
  { keys: KEYS.layers, does: 'Show/hide the Layers panel' },
  { keys: KEYS.minimap, does: 'Show/hide the Minimap' },
  { keys: KEYS.filters, does: 'Show/hide the Filters panel' },
  { keys: KEYS.collision, does: 'Show/hide the Collision group' },
  { keys: KEYS.enemies, does: 'Show/hide the Enemies group' },
  { keys: KEYS.goodies, does: 'Show/hide the Goodies group' },
  { keys: `${KEYS.fit}, Ctrl / Cmd + ${KEYS.fit}`, does: 'Fit to view' },
  { keys: `${KEYS.actualSize}, Ctrl / Cmd + ${KEYS.actualSize}`, does: 'Original size, 100%' },
  // Handled by the field it empties rather than by the table above, which is why nothing resolves it.
  { keys: 'Escape', does: 'Clear the search' },
];

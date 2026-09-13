import { describe, expect, it } from 'vitest';

import { SHORTCUT_HELP, resolveShortcut } from './shortcuts';

const key = (key: string, code: string, extra: Partial<{ ctrlKey: boolean; metaKey: boolean }> = {}) => ({
  key,
  code,
  ctrlKey: false,
  metaKey: false,
  ...extra,
});

describe('a single letter', () => {
  it('opens or closes the panel it names', () => {
    expect(resolveShortcut(key('l', 'KeyL'), false)).toEqual({ kind: 'toggle-panel', panel: 'levels' });
    expect(resolveShortcut(key('y', 'KeyY'), false)).toEqual({ kind: 'toggle-panel', panel: 'layers' });
    expect(resolveShortcut(key('m', 'KeyM'), false)).toEqual({ kind: 'toggle-panel', panel: 'minimap' });
  });

  it('reads case-insensitively, so Shift does not lose the shortcut', () => {
    expect(resolveShortcut(key('L', 'KeyL'), false)).toEqual({ kind: 'toggle-panel', panel: 'levels' });
  });

  it('toggles Filters', () => {
    expect(resolveShortcut(key('f', 'KeyF'), false)).toEqual({ kind: 'toggle-filters' });
  });

  it('toggles a whole layer group, never one leaf', () => {
    expect(resolveShortcut(key('c', 'KeyC'), false)).toEqual({
      kind: 'toggle-layer-group',
      key: 'base/collision',
    });
    expect(resolveShortcut(key('e', 'KeyE'), false)).toEqual({ kind: 'toggle-layer-group', key: 'enemies' });
    expect(resolveShortcut(key('g', 'KeyG'), false)).toEqual({ kind: 'toggle-layer-group', key: 'goodies' });
  });

  it('does nothing while a field or a dialog is typing', () => {
    expect(resolveShortcut(key('l', 'KeyL'), true)).toBeNull();
    expect(resolveShortcut(key('c', 'KeyC'), true)).toBeNull();
  });

  it('names nothing for a key with no shortcut', () => {
    expect(resolveShortcut(key('z', 'KeyZ'), false)).toBeNull();
  });
});

describe('the digits', () => {
  it('reads them by position, so a layout where 1 needs Shift still fits', () => {
    expect(resolveShortcut(key(')', 'Digit0'), false)).toEqual({ kind: 'fit' });
    expect(resolveShortcut(key('!', 'Digit1'), false)).toEqual({ kind: 'actual-size' });
  });

  it('answer the same from the numeric keypad', () => {
    expect(resolveShortcut(key('0', 'Numpad0'), false)).toEqual({ kind: 'fit' });
    expect(resolveShortcut(key('1', 'Numpad1'), false)).toEqual({ kind: 'actual-size' });
  });

  it('read the keypad by its code even with Num Lock off, where key names an editing action instead', () => {
    expect(resolveShortcut(key('Insert', 'Numpad0'), false)).toEqual({ kind: 'fit' });
    expect(resolveShortcut(key('End', 'Numpad1'), false)).toEqual({ kind: 'actual-size' });
  });

  it('are suspended while typing, like every other single key', () => {
    expect(resolveShortcut(key('0', 'Digit0'), true)).toBeNull();
    expect(resolveShortcut(key('0', 'Numpad0'), true)).toBeNull();
  });
});

describe('a combination', () => {
  it('fits or frames at 100% with Ctrl or Cmd, regardless of the digit typed', () => {
    expect(resolveShortcut(key('0', 'Digit0', { ctrlKey: true }), false)).toEqual({ kind: 'fit' });
    expect(resolveShortcut(key('1', 'Digit1', { metaKey: true }), false)).toEqual({ kind: 'actual-size' });
  });

  it('works from the numeric keypad too', () => {
    expect(resolveShortcut(key('0', 'Numpad0', { ctrlKey: true }), false)).toEqual({ kind: 'fit' });
    expect(resolveShortcut(key('1', 'Numpad1', { metaKey: true }), false)).toEqual({ kind: 'actual-size' });
  });

  it('reaches across a focused field, unlike a single key', () => {
    expect(resolveShortcut(key('0', 'Digit0', { ctrlKey: true }), true)).toEqual({ kind: 'fit' });
  });

  it('opens or closes Go to map with Ctrl or Cmd + K, even while typing', () => {
    expect(resolveShortcut(key('k', 'KeyK', { ctrlKey: true }), false)).toEqual({ kind: 'toggle-goto' });
    expect(resolveShortcut(key('k', 'KeyK', { metaKey: true }), true)).toEqual({ kind: 'toggle-goto' });
  });

  it('names nothing for a digit the shortcuts do not cover', () => {
    expect(resolveShortcut(key('5', 'Digit5', { ctrlKey: true }), false)).toBeNull();
  });
});

describe('the shortcuts dialog and the table it describes', () => {
  /** Every single character the dialog names, the words `Ctrl`, `Cmd`, and `Escape` aside. */
  const listed = new Set(
    SHORTCUT_HELP.flatMap((line) => line.keys.split(/[^A-Za-z0-9]+/))
      .filter((token) => token.length === 1)
      .map((token) => token.toUpperCase()),
  );

  /** One keystroke, given a character, since a digit answers by its code and a letter by its key. */
  const press = (character: string, held: boolean) => ({
    key: character.toLowerCase(),
    code: /\d/.test(character) ? `Digit${character}` : `Key${character.toUpperCase()}`,
    ctrlKey: held,
    metaKey: false,
  });

  const answers = (character: string) =>
    resolveShortcut(press(character, false), false) ?? resolveShortcut(press(character, true), false);

  const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'];

  it('names every key that does something, so nothing is available and unfindable', () => {
    const doing = alphabet.filter((character) => answers(character) !== null);
    expect(doing.length).toBeGreaterThan(0);
    for (const character of doing) expect(listed, character).toContain(character);
  });

  it('names nothing that does not, so the dialog cannot promise a key that was renamed', () => {
    for (const character of listed) expect(answers(character), character).not.toBeNull();
  });

  it('words every toggle it lists the same way, panels and layer groups alike', () => {
    const toggles = SHORTCUT_HELP.filter((line) => line.does.startsWith('Show/hide'));
    expect(toggles).toHaveLength(7);
    for (const line of toggles) expect(line.does, line.keys).toMatch(/^Show\/hide the [A-Z]/);
  });
});

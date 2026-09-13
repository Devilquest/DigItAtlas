import { describe, expect, it } from 'vitest';

import { GUIDE_BLOCKS, GUIDE_CLOSING, LABEL_COLORS, guideParts } from './guide';
import { GO_TO_KEYS, resolveShortcut } from './shortcuts';

/** Everything the guide marks as a key, which is what the dialog draws as one. */
const marked = GUIDE_BLOCKS.flatMap((block) => guideParts(block.body))
  .filter((part) => part.kind === 'key')
  .map((part) => part.text);

const press = (character: string) => ({
  key: character.toLowerCase(),
  code: /\d/.test(character) ? `Digit${character}` : `Key${character.toUpperCase()}`,
  ctrlKey: false,
  metaKey: false,
});

describe('a paragraph', () => {
  it('comes apart into what is read, what is pressed and what is clicked', () => {
    expect(guideParts('Fit `0` frames it, see [Keyboard shortcuts].')).toEqual([
      { text: 'Fit ', kind: 'words' },
      { text: '0', kind: 'key' },
      { text: ' frames it, see ', kind: 'words' },
      { text: 'Keyboard shortcuts', kind: 'link' },
      { text: '.', kind: 'words' },
    ]);
  });

  it('is one part when it marks nothing, and keeps a mark that opens it', () => {
    expect(guideParts('Nothing needs a click.')).toEqual([
      { text: 'Nothing needs a click.', kind: 'words' },
    ]);
    expect(guideParts('`L` opens it.')).toEqual([
      { text: 'L', kind: 'key' },
      { text: ' opens it.', kind: 'words' },
    ]);
  });
});

describe('the closing line', () => {
  it('offers exactly one link, since one thing opens when it is clicked', () => {
    expect(guideParts(GUIDE_CLOSING).filter((part) => part.kind === 'link')).toHaveLength(1);
  });
});

describe('the keys the guide names', () => {
  it('names some at all, so the check below cannot pass on an empty list', () => {
    expect(marked.length).toBeGreaterThan(5);
  });

  it('answers every one of them, so the guide cannot promise a key that was remapped', () => {
    for (const keys of marked) {
      if (keys.length > 1) expect(keys).toBe(GO_TO_KEYS);
      else expect(resolveShortcut(press(keys), false), keys).not.toBeNull();
    }
  });
});

describe('the destination labels table', () => {
  it('shows each color once', () => {
    expect(new Set(LABEL_COLORS.map((row) => row.color)).size).toBe(LABEL_COLORS.length);
  });

  it('shows each color with a label picture of its own', () => {
    expect(new Set(LABEL_COLORS.map((row) => row.tag)).size).toBe(LABEL_COLORS.length);
  });

  it('shows every color in the color it names, never an example of another one', () => {
    for (const row of LABEL_COLORS) {
      expect(row.tag.endsWith(`-${row.color.toLowerCase()}`), row.color).toBe(true);
    }
  });
});

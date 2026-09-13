import { describe, expect, it } from 'vitest';

import {
  cursorReadout,
  identityParts,
  markedLabel,
  objectPosition,
  panelToggleTitle,
  resultsHeader,
  spriteSize,
  zoomLabel,
} from './format';
import { buildTree } from './levels';
import type { LevelIndex } from './types';

const map = (id: string, label: string) => ({
  id,
  label,
  bonus: false,
  size: [8, 8] as [number, number],
  counts: {},
});

const tree = buildTree({
  worlds: [
    { n: 1, name: 'Dry Lands' },
    { n: 5, name: 'Spurkasaur Lair' },
  ],
  nodes: [
    { w: 1, l: 1, name: 'Warm Up Run' },
    { w: 1, l: 2, name: 'Deep Duggy' },
    { w: 4, l: 16, name: 'Spurkasaur Lair', show: 5 },
  ],
  maps: [
    map('1-1-1', 'Substage 1'),
    map('1-1-2', 'Bonus 1'),
    map('1-2-1', 'Substage 1'),
    map('4-16-1', 'Substage 1'),
  ],
} satisfies LevelIndex);

const SIZE = { w: 1280, h: 500 };

describe('the identity line', () => {
  it('names the world, the level, the map, and its size', () => {
    expect(identityParts(tree, { kind: 'level', id: '1-1-2' }, SIZE)).toEqual([
      { text: 'Dry Lands' },
      { text: 'Warm Up Run', strong: true },
      { text: 'Bonus 1' },
      { text: '1280x500' },
    ]);
  });

  it('does not name a level and its only map twice', () => {
    expect(identityParts(tree, { kind: 'level', id: '1-2-1' }, SIZE)).toEqual([
      { text: 'Dry Lands' },
      { text: 'Deep Duggy', strong: true },
      { text: '1280x500' },
    ]);
  });

  it('says a name once where the level and its world share one, and keeps its emphasis', () => {
    expect(identityParts(tree, { kind: 'level', id: '4-16-1' }, SIZE)).toEqual([
      { text: 'Spurkasaur Lair', strong: true },
      { text: '1280x500' },
    ]);
  });

  it('names a world map under the world it belongs to', () => {
    expect(identityParts(tree, { kind: 'world', n: 1 }, { w: 640, h: 400 })).toEqual([
      { text: 'Dry Lands' },
      { text: 'World Map', strong: true },
      { text: '640x400' },
    ]);
  });

  it('says nothing about an address that names no map', () => {
    expect(identityParts(tree, { kind: 'unknown', raw: 'nonsense' }, SIZE)).toEqual([]);
    expect(identityParts(tree, { kind: 'level', id: '9-9-9' }, SIZE)).toEqual([]);
    expect(identityParts(tree, { kind: 'world', n: 9 }, SIZE)).toEqual([]);
  });
});

// The game's screen, as the catalog reports it. Passed in rather than assumed, which is what
// lets the case below hold the arithmetic against a block of another size.
const BLOCK = { w: 320, h: 200 };

describe('the cursor readout', () => {
  it('gives the map pixel and the block it falls in', () => {
    expect(cursorReadout({ x: 1165.8, y: 402.2 }, SIZE, BLOCK)).toBe('X 1165  Y 402 · C 3  R 2');
    expect(cursorReadout({ x: 0, y: 0 }, SIZE, BLOCK)).toBe('X 0  Y 0 · C 0  R 0');
  });

  it('counts blocks from zero, one per screen of the game', () => {
    expect(cursorReadout({ x: 319, y: 199 }, SIZE, BLOCK)).toBe('X 319  Y 199 · C 0  R 0');
    expect(cursorReadout({ x: 320, y: 200 }, SIZE, BLOCK)).toBe('X 320  Y 200 · C 1  R 1');
  });

  it('goes blank off the map, and where there is no pointer at all', () => {
    expect(cursorReadout(null, SIZE, BLOCK)).toBe('');
    expect(cursorReadout({ x: -1, y: 10 }, SIZE, BLOCK)).toBe('');
    expect(cursorReadout({ x: 10, y: -1 }, SIZE, BLOCK)).toBe('');
    expect(cursorReadout({ x: 1280, y: 10 }, SIZE, BLOCK)).toBe('');
    expect(cursorReadout({ x: 10, y: 500 }, SIZE, BLOCK)).toBe('');
  });

  it('writes a four-figure coordinate without a separator', () => {
    expect(cursorReadout({ x: 2879, y: 219 }, { w: 2880, h: 220 }, BLOCK)).toBe('X 2879  Y 219 · C 8  R 1');
  });

  it('counts in whatever block it is given, rather than in one of its own', () => {
    expect(cursorReadout({ x: 200, y: 150 }, SIZE, { w: 100, h: 50 })).toBe('X 200  Y 150 · C 2  R 3');
  });
});

describe('the zoom label', () => {
  it('states whole percent at the ends of the range and in between', () => {
    expect(zoomLabel(0.1)).toBe('10%');
    expect(zoomLabel(1)).toBe('100%');
    expect(zoomLabel(32)).toBe('3200%');
    expect(zoomLabel(1.25 ** 3)).toBe('195%');
  });
});

describe('an object\'s position', () => {
  it('writes it the way the cursor readout does', () => {
    expect(objectPosition(656, 441)).toBe('X 656  Y 441');
  });
});

describe('a sprite\'s size', () => {
  it('writes the drawing box in pixels', () => {
    expect(spriteSize(32, 18)).toBe('32 x 18 px');
  });

  it('adds the visible size when the drawing box is cut off by the map edge', () => {
    expect(spriteSize(90, 50, { w: 40, h: 50 })).toBe('90 x 50 px (visible 40 x 50 px)');
  });

  it('stays a single measure when the whole drawing box is on the map', () => {
    expect(spriteSize(90, 50, { w: 90, h: 50 })).toBe('90 x 50 px');
  });
});

describe('the results header', () => {
  it('counts what a search alone found, and says nothing about filters there are none of', () => {
    expect(resultsHeader(12, 0)).toBe('12 matches');
    expect(resultsHeader(1, 0)).toBe('1 match');
  });

  it('says no matching levels rather than counting to zero', () => {
    expect(resultsHeader(0, 0)).toBe('No matching levels');
  });

  it('names the conditions as well, so a shortened list says where the shortening came from', () => {
    expect(resultsHeader(12, 3)).toBe('12 matches · 3 filters');
    expect(resultsHeader(4, 1)).toBe('4 matches · 1 filter');
    expect(resultsHeader(1, 2)).toBe('1 match · 2 filters');
  });

  it('still says so where the conditions are what left nothing', () => {
    expect(resultsHeader(0, 3)).toBe('No matching levels · 3 filters');
  });
});

describe('marking what a search matched', () => {
  it('splits the label around the match', () => {
    expect(markedLabel('Warm Up Run', 'up')).toEqual({ before: 'Warm ', hit: 'Up', after: ' Run' });
  });

  it('keeps the label as it is spelled, whatever was typed', () => {
    expect(markedLabel('Gem', 'GE').hit).toBe('Ge');
  });

  it('marks nothing where the search is blank or is only spaces', () => {
    expect(markedLabel('Gem', '')).toEqual({ before: 'Gem', hit: '', after: '' });
    expect(markedLabel('Gem', '   ')).toEqual({ before: 'Gem', hit: '', after: '' });
  });

  it('ignores the spaces around what was typed, as the search itself does', () => {
    expect(markedLabel('Gem', ' gem ').hit).toBe('Gem');
  });

  it('marks nothing where the label does not carry the text', () => {
    expect(markedLabel('Gem', 'rock')).toEqual({ before: 'Gem', hit: '', after: '' });
  });

  it('marks the first occurrence, which in a level row is the part the search matched on', () => {
    // The Levels panel searches level names and lists "level · map", so a hit in the map half is a
    // coincidence and the level half is what answered the query.
    expect(markedLabel('Bonus Run · Bonus 1', 'bonus').before).toBe('');
  });
});

describe('what a panel toggle says it will do', () => {
  it('offers the opposite of what is on screen, and names the key that does it too', () => {
    expect(panelToggleTitle('Levels', 'L', false)).toBe('Show Levels panel (L)');
    expect(panelToggleTitle('Levels', 'L', true)).toBe('Hide Levels panel (L)');
  });
});

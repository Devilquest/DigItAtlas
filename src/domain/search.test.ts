import { describe, expect, it } from 'vitest';

import { buildTree } from './levels';
import { countHits, findMaps } from './search';
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
    { n: 2, name: 'Great Waters' },
  ],
  nodes: [
    { w: 1, l: 1, name: 'Warm Up Run' },
    { w: 1, l: 2, name: 'Deep Duggy' },
    { w: 2, l: 1, name: 'Deep Water Run' },
  ],
  maps: [
    map('1-1-1', 'Substage 1'),
    map('1-1-2', 'Bonus 1'),
    map('1-2-1', 'Substage 1'),
    map('2-1-1', 'Substage 1'),
  ],
} satisfies LevelIndex);

describe('searching level names', () => {
  it('finds a level wherever the text falls in its name, whatever its case', () => {
    for (const typed of ['warm', 'WARM UP', 'up run', ' warm ']) {
      expect(findMaps(tree, typed).flatMap((group) => group.hits).length, typed).toBe(2);
    }
  });

  it('lists one row per map, named for the level and the map both', () => {
    expect(findMaps(tree, 'warm')[0]?.hits).toEqual([
      { route: { kind: 'level', id: '1-1-1' }, label: 'Warm Up Run · Substage 1' },
      { route: { kind: 'level', id: '1-1-2' }, label: 'Warm Up Run · Bonus 1' },
    ]);
  });

  it('names a level with one map by the level alone', () => {
    expect(findMaps(tree, 'duggy')[0]?.hits).toEqual([
      { route: { kind: 'level', id: '1-2-1' }, label: 'Deep Duggy' },
    ]);
  });

  it('keeps the matches of each world together and drops the worlds with none', () => {
    const groups = findMaps(tree, 'run');
    expect(groups.map((group) => group.name)).toEqual(['Dry Lands', 'Great Waters']);
    expect(countHits(groups)).toBe(3);
    expect(findMaps(tree, 'duggy').map((group) => group.name)).toEqual(['Dry Lands']);
  });

  it('excludes nothing when nothing was typed, world maps included', () => {
    for (const empty of ['', '   ']) {
      expect(countHits(findMaps(tree, empty)), JSON.stringify(empty)).toBe(6);
    }
  });

  it('answers a text no level and no world carries with no groups at all', () => {
    expect(findMaps(tree, 'spurkasaur')).toEqual([]);
    expect(countHits(findMaps(tree, 'spurkasaur'))).toBe(0);
  });
});

describe("a world's own screen and levels", () => {
  it('places the world map first when its world name is searched, followed by all levels under it', () => {
    const hits = findMaps(tree, 'dry lands')[0]?.hits;
    expect(hits).toEqual([
      { route: { kind: 'world', n: 1 }, label: 'World Map' },
      { route: { kind: 'level', id: '1-1-1' }, label: 'Warm Up Run · Substage 1' },
      { route: { kind: 'level', id: '1-1-2' }, label: 'Warm Up Run · Bonus 1' },
      { route: { kind: 'level', id: '1-2-1' }, label: 'Deep Duggy' },
    ]);
  });

  it('lists every world where the text names none of them', () => {
    const groups = findMaps(tree, 'world map');
    expect(groups.map((group) => group.hits)).toEqual([
      [{ route: { kind: 'world', n: 1 }, label: 'World Map' }],
      [{ route: { kind: 'world', n: 2 }, label: 'World Map' }],
    ]);
  });

  it('comes before the world’s own levels, in the tree’s own order', () => {
    const hits = findMaps(tree, '')[0]?.hits;
    expect(hits?.[0]).toEqual({ route: { kind: 'world', n: 1 }, label: 'World Map' });
  });

  it('drops the world map once filters are narrowing, while its maps survive where filters keep them', () => {
    const groups = findMaps(tree, 'dry lands', () => true, false);
    expect(groups[0]?.hits.some((hit) => hit.label === 'World Map')).toBe(false);
    expect(countHits(groups)).toBe(3);
  });

  it('stays out of the count once filters drop it, even unfiltered by name', () => {
    expect(countHits(findMaps(tree, '', () => true, false))).toBe(4);
  });
});

describe('narrowing by filter as well', () => {
  it('keeps only the maps the filters keep', () => {
    const bonusOnly = findMaps(tree, '', (id) => id === '1-1-2', false);
    expect(bonusOnly.map((group) => group.name)).toEqual(['Dry Lands']);
    expect(bonusOnly[0]?.hits).toEqual([
      { route: { kind: 'level', id: '1-1-2' }, label: 'Warm Up Run · Bonus 1' },
    ]);
  });

  it('still names a survivor for its level and its map where the level has several', () => {
    expect(findMaps(tree, '', (id) => id === '1-1-1', false)[0]?.hits).toEqual([
      { route: { kind: 'level', id: '1-1-1' }, label: 'Warm Up Run · Substage 1' },
    ]);
  });

  it('narrows by the text and the filters at once, never by either alone', () => {
    expect(countHits(findMaps(tree, 'run', (id) => id.startsWith('1-'), false))).toBe(2);
    expect(countHits(findMaps(tree, 'duggy', (id) => id.startsWith('2-'), false))).toBe(0);
  });
});

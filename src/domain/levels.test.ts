import { describe, expect, it } from 'vitest';

import { branchKeys, branchesTo, buildTree, carries, levelKey, oneClickAway, worldKey } from './levels';
import type { LevelIndex } from './types';

const map = (id: string, label: string, bonus = false) => ({
  id,
  label,
  bonus,
  size: [8, 8] as [number, number],
  counts: {},
});

const index: LevelIndex = {
  worlds: [
    { n: 1, name: 'Dry Lands' },
    { n: 2, name: 'Great Waters' },
  ],
  nodes: [
    { w: 1, l: 2, name: 'Draggostellago' },
    { w: 1, l: 1, name: 'Warm Up Run' },
    { w: 1, l: 9, name: 'Boss Arena', show: 2 },
  ],
  maps: [
    map('1-1-2', 'Bonus 1', true),
    map('1-1-1', 'Substage 1'),
    map('1-1-3', 'Substage 2'),
    map('1-2-1', 'Substage 1'),
    map('1-9-1', 'Substage 1'),
  ],
};

const tree = buildTree(index);
const dryLands = tree[0]!;
const greatWaters = tree[1]!;
const warmUpRun = dryLands.levels[0]!;
const bossArena = greatWaters.levels[0]!;

describe('the navigation tree', () => {
  it('lists the worlds the index lists, in its order', () => {
    expect(tree.map((world) => world.name)).toEqual(['Dry Lands', 'Great Waters']);
  });

  it('orders the levels of a world by their numbering, whatever order the index carries', () => {
    expect(dryLands.levels.map((level) => level.name)).toEqual(['Warm Up Run', 'Draggostellago']);
  });

  it('files each map under its level, in substage order', () => {
    expect(warmUpRun.maps.map((leaf) => leaf.id)).toEqual(['1-1-1', '1-1-3', '1-1-2']);
  });

  it('lists the bonus zones after the substages, wherever the level file puts them', () => {
    expect(warmUpRun.maps.map((leaf) => leaf.label)).toEqual([
      'Substage 1',
      'Substage 2',
      'Bonus 1',
    ]);
  });

  it('shows a level under the world it names, not the world it is numbered in', () => {
    expect(dryLands.levels.map((level) => level.level)).not.toContain(9);
    expect(greatWaters.levels.map((level) => level.name)).toEqual(['Boss Arena']);
    expect(bossArena.maps[0]!.id).toBe('1-9-1');
  });
});

describe('finding a map in the tree', () => {
  it('names the world and the level that hold it', () => {
    expect(branchesTo(tree, '1-1-3')).toEqual([worldKey(1), levelKey(warmUpRun)]);
  });

  it('names the world a moved level is shown under', () => {
    expect(branchesTo(tree, '1-9-1')).toEqual([worldKey(2), levelKey(bossArena)]);
  });

  it('opens nothing for a map no leaf carries', () => {
    expect(branchesTo(tree, '9-9-9')).toEqual([]);
  });
});

describe('the keys a command over the whole tree acts on', () => {
  const keys = branchKeys(tree);

  it('names every world', () => {
    expect(keys).toContain(worldKey(1));
    expect(keys).toContain(worldKey(2));
  });

  it('names a level that holds more than one map', () => {
    expect(keys).toContain(levelKey(warmUpRun));
  });

  it('leaves out a level whose single map makes it a leaf', () => {
    expect(keys).not.toContain(levelKey(bossArena));
  });
});

describe('whether the index carries the map an address names', () => {
  it('carries a level the index lists', () => {
    expect(carries(index, { kind: 'level', id: '1-1-3' })).toBe(true);
  });

  it('carries no level the index does not list, however well formed the address is', () => {
    expect(carries(index, { kind: 'level', id: '9-9-9' })).toBe(false);
  });

  it('carries a world the index lists, and none it does not', () => {
    expect(carries(index, { kind: 'world', n: 2 })).toBe(true);
    expect(carries(index, { kind: 'world', n: 7 })).toBe(false);
  });

  it('carries nothing at an address that names no map at all', () => {
    expect(carries(index, { kind: 'unknown', raw: '/nowhere' })).toBe(false);
  });
});

describe('the maps one click away', () => {
  it('is the world map first, then the level own other maps, in the panel order', () => {
    expect(oneClickAway(index, { kind: 'level', id: '1-1-1' })).toEqual([
      { kind: 'world', n: 1 },
      { kind: 'level', id: '1-1-3' },
      { kind: 'level', id: '1-1-2' },
    ]);
  });

  it('never names the map on screen', () => {
    for (const id of ['1-1-1', '1-1-2', '1-1-3']) {
      expect(oneClickAway(index, { kind: 'level', id })).not.toContainEqual({ kind: 'level', id });
    }
  });

  it('is the world map alone where the level holds one map', () => {
    expect(oneClickAway(index, { kind: 'level', id: '1-2-1' })).toEqual([{ kind: 'world', n: 1 }]);
  });

  it('is the world the level is shown under, not the world it is numbered in', () => {
    expect(oneClickAway(index, { kind: 'level', id: '1-9-1' })).toEqual([{ kind: 'world', n: 2 }]);
  });

  it('is nothing at all from a level-select screen, whose signposts lead everywhere', () => {
    expect(oneClickAway(index, { kind: 'world', n: 1 })).toEqual([]);
  });

  it('is nothing from an address the index carries no map for', () => {
    expect(oneClickAway(index, { kind: 'level', id: '9-9-9' })).toEqual([]);
    expect(oneClickAway(index, { kind: 'unknown', raw: '/nowhere' })).toEqual([]);
  });
});

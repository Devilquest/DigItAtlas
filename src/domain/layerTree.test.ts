import { describe, expect, it } from 'vitest';

import {
  buildLevelLayers,
  buildWorldLayers,
  groupKeys,
  keysUnder,
  leavesOf,
  matching,
  nodeByKey,
  setAll,
  stateOf,
  toggled,
  visibleIds,
} from './layerTree';
import type { LayerGroup, LayerNode } from './layerTree';
import type { Catalog, Level, Link, ObjectType, WorldMap } from './types';

const type = (label: string, group: string, extra: Partial<ObjectType> = {}): ObjectType => ({
  label,
  group,
  sprite: `${label}.webp`,
  w: 8,
  h: 8,
  ...extra,
});

const catalog: Catalog = {
  build: { exe: { name: 'DIGIT.EXE', size: 1, sha256: 'x' }, exported: '', id: 'test' },
  block: [320, 200],
  groups: [
    { id: 'goodies', label: 'Goodies' },
    { id: 'enemies', label: 'Enemies' },
    { id: 'decor', label: 'Decor' },
    { id: 'mechanisms', label: 'Mechanisms' },
    { id: 'markers', label: 'Markers' },
  ],
  subs: [
    { id: 'gold', label: 'Gold', group: 'goodies' },
    { id: 'gem', label: 'Gem', group: 'goodies' },
  ],
  types: {
    pickaxe: type('Pickaxe', 'goodies', { sub: 'gold' }),
    shovel: type('Shovel', 'goodies', { sub: 'gold' }),
    'gem-00': type('Gem', 'goodies', { sub: 'gem' }),
    'gem-01': type('Gem', 'goodies', { sub: 'gem' }),
    rocker: type('Rocker', 'enemies'),
    draggo: type('Draggo', 'enemies'),
    vine: type('Vine', 'decor'),
    'moving-platform': type('Moving Platform', 'mechanisms', { collider: 'platform-hit.webp' }),
    drain: type('Drain', 'markers', {
      looks: { water: { sprite: 'drain.webp', w: 8, h: 8, collider: 'drain-hit.webp' } },
    }),
  },
  signs: {
    level: { w: 28, h: 27, sprites: { '1': 'sign-level-w1.webp' } },
    gate: { w: 28, h: 27, sprites: { '1': 'sign-gate-w1.webp' } },
  },
  tags: {
    'substage-2-amber': { sprite: 'substage-2-amber.webp', w: 148, h: 26, kind: 'exit' },
    'level-complete-red': { sprite: 'level-complete-red.webp', w: 196, h: 26, kind: 'exit' },
    'bonus-1-green': { sprite: 'bonus-1-green.webp', w: 108, h: 22, kind: 'bonus' },
    'substage-1-green': { sprite: 'substage-1-green.webp', w: 148, h: 26, kind: 'bonus' },
  },
};

const link = (tag: string): Link => ({ at: [0, 0], to: null, label: 'irrelevant', tag, tagAt: [0, 0] });

const level = (
  look: string,
  objects: Record<string, Array<[number, number]>>,
  links: Link[] = [],
): Level => ({
  id: '1-1-1',
  stem: 'LVL000',
  look,
  size: [320, 200],
  terrain: 'maps/1-1-1.webp',
  collision: 'maps/1-1-1-collision.webp',
  objects,
  links,
});

const world = (n: number, signs: Array<string | undefined>): WorldMap => ({
  n,
  map: 'MAP1',
  name: 'Dry Lands',
  size: [320, 200],
  terrain: 'worlds/1.webp',
  path: 'worlds/1-path.webp',
  nodes: signs.map((sign) => {
    const at: [number, number] = [0, 0];
    return sign === undefined ? { at, label: 'Check Point' } : { at, label: 'Warm Up Run', sign };
  }),
});

function groupAt(nodes: readonly LayerNode[], key: string): LayerGroup {
  for (const node of nodes) {
    if (node.kind !== 'group') continue;
    if (node.key === key) return node;
    const deeper = groupAt(node.children, key);
    if (deeper !== undefined) return deeper;
  }
  return undefined as unknown as LayerGroup;
}

const keys = (nodes: readonly LayerNode[]) => nodes.map((node) => node.key);

/** The leaves a map would open with where nothing has ever been said about them. */
const defaultKeys = (nodes: readonly LayerNode[]) =>
  new Set(leavesOf(nodes).filter((leaf) => leaf.on).map((leaf) => leaf.key));

const tree = buildLevelLayers(
  level('water', {
    pickaxe: [[0, 0]],
    'gem-00': [[8, 0]],
    'gem-01': [[16, 0]],
    draggo: [[24, 0]],
    'moving-platform': [[32, 0]],
    drain: [[40, 0]],
  }),
  catalog,
);

describe('a level tree', () => {
  it('lists Base first and then every catalog group, in the catalog order', () => {
    expect(keys(tree)).toEqual(['base', 'goodies', 'enemies', 'mechanisms', 'markers']);
  });

  it('drops a group the level places nothing of', () => {
    expect(keys(tree)).not.toContain('decor');
  });

  it('offers only the types the level places', () => {
    expect(keys(groupAt(tree, 'enemies').children)).toEqual(['enemies/draggo']);
  });

  it('ignores a type the level lists but places none of', () => {
    const one = buildLevelLayers(level('water', { draggo: [], rocker: [[0, 0]] }), catalog);
    expect(keys(groupAt(one, 'enemies').children)).toEqual(['enemies/rocker']);
  });

  it('names each leaf after its type, alphabetically within its group', () => {
    const both = buildLevelLayers(level('water', { rocker: [[0, 0]], draggo: [[8, 0]] }), catalog);
    expect(groupAt(both, 'enemies').children.map((node) => node.label)).toEqual(['Draggo', 'Rocker']);
  });

  it('collapses a subgroup whose types all carry one name into one leaf', () => {
    const gems = leavesOf(tree).find((held) => held.key === 'goodies/gem');
    expect(gems?.label).toBe('Gem');
    expect(gems?.ids).toEqual(['gem-00', 'gem-01']);
  });

  it('breaks down a subgroup whose types are named individually', () => {
    expect(keys(groupAt(tree, 'goodies/gold').children)).toEqual(['goodies/gold/pickaxe']);
  });

  it('reads that breakdown from the whole vocabulary, so one placed gold item is still named', () => {
    const one = buildLevelLayers(level('water', { pickaxe: [[0, 0]] }), catalog);
    expect(groupAt(one, 'goodies/gold').children.map((node) => node.label)).toEqual(['Pickaxe']);
  });
});

describe('counts', () => {
  it('gives a leaf the number of objects it stands for', () => {
    expect(leavesOf(tree).find((held) => held.key === 'enemies/draggo')?.count).toBe(1);
  });

  it('gives a collapsed leaf the sum across every id it covers', () => {
    expect(leavesOf(tree).find((held) => held.key === 'goodies/gem')?.count).toBe(2);
  });

  it('gives a catalog group the sum of everything placed under it', () => {
    expect(groupAt(tree, 'goodies').count).toBe(3);
  });

  it('gives a broken-down subgroup the sum of its own leaves, not the whole catalog group', () => {
    expect(groupAt(tree, 'goodies/gold').count).toBe(1);
  });

  it('never counts Base, Terrain, or Collision, however many footprints they hold', () => {
    expect(groupAt(tree, 'base').count).toBeUndefined();
    expect(groupAt(tree, 'base/collision').count).toBeUndefined();
    expect(leavesOf(tree).find((held) => held.key === 'base/terrain')?.count).toBeUndefined();
    expect(leavesOf(tree).find((held) => held.key === 'base/collision/drain')?.count).toBeUndefined();
  });
});

describe('the Base group', () => {
  it('holds the terrain and the Collision group', () => {
    expect(keys(groupAt(tree, 'base').children)).toEqual(['base/terrain', 'base/collision']);
  });

  it('gives Collision the level plane first and then one leaf per placed footprint', () => {
    expect(keys(groupAt(tree, 'base/collision').children)).toEqual([
      'base/collision/terrain',
      'base/collision/drain',
      'base/collision/moving-platform',
    ]);
  });

  it('reads a footprint from the look the level draws in', () => {
    const dry = buildLevelLayers(level('land', { drain: [[0, 0]], 'moving-platform': [[8, 0]] }), catalog);
    expect(keys(groupAt(dry, 'base/collision').children)).toEqual([
      'base/collision/terrain',
      'base/collision/moving-platform',
    ]);
  });

  it('draws each footprint as its own scene layer, apart from the object', () => {
    const footprint = leavesOf(tree).find((held) => held.key === 'base/collision/moving-platform');
    expect(footprint?.ids).toEqual(['collision:moving-platform']);
  });
});

describe('what a map opens with', () => {
  it('turns the terrain and every object layer on', () => {
    const on = defaultKeys(tree);
    expect(on.has('base/terrain')).toBe(true);
    expect(on.has('enemies/draggo')).toBe(true);
    expect(on.has('goodies/gem')).toBe(true);
  });

  it('turns the whole Collision group off', () => {
    const on = defaultKeys(tree);
    expect(keysUnder(groupAt(tree, 'base/collision')).some((key) => on.has(key))).toBe(false);
  });
});

describe('a world map tree', () => {
  it('holds the map, the path, and a Signs group', () => {
    expect(keys(buildWorldLayers(world(1, ['level', 'gate']), catalog))).toEqual([
      'world/map',
      'world/path',
      'world/signs',
    ]);
  });

  it('gives each signpost the world stands its own leaf, named and ordered as the Explorer', () => {
    const signs = groupAt(buildWorldLayers(world(1, ['level', 'gate']), catalog), 'world/signs');
    expect(signs.children.map((node) => [node.key, node.label])).toEqual([
      ['world/signs/level', 'Level Complete'],
      ['world/signs/gate', 'Connection Cave'],
    ]);
    expect(leavesOf(signs.children).map((leaf) => leaf.ids)).toEqual([['level'], ['gate']]);
  });

  it('opens with the map and every signpost, but not the path', () => {
    const on = defaultKeys(buildWorldLayers(world(1, ['level', 'gate']), catalog));
    expect([...on].sort()).toEqual(['world/map', 'world/signs/gate', 'world/signs/level']);
  });

  it('offers no Signs group where the world stands no signs', () => {
    expect(keys(buildWorldLayers(world(1, [undefined]), catalog))).toEqual(['world/map', 'world/path']);
  });

  it('offers no Signs group for a world the sign has no art for', () => {
    expect(keys(buildWorldLayers(world(2, ['level']), catalog))).toEqual(['world/map', 'world/path']);
  });
});

describe('what the map draws', () => {
  it('draws the scene layers of the ticked leaves and nothing else', () => {
    expect([...visibleIds(tree, new Set(['goodies/gem', 'base/terrain']))].sort()).toEqual([
      'gem-00',
      'gem-01',
      'terrain',
    ]);
  });

  it('draws nothing at all where nothing is ticked', () => {
    expect(visibleIds(tree, new Set()).size).toBe(0);
  });
});

describe('a checkbox', () => {
  it('reads a group as on only when every leaf under it is', () => {
    const enemies = groupAt(tree, 'enemies');
    expect(stateOf(enemies, new Set(keysUnder(enemies)))).toBe('on');
  });

  it('reads a group as partly on when some of its leaves are', () => {
    expect(stateOf(groupAt(tree, 'base'), new Set(['base/terrain']))).toBe('mixed');
  });

  it('reads a group as off when none of its leaves are on', () => {
    expect(stateOf(groupAt(tree, 'base'), new Set(['enemies/draggo']))).toBe('off');
  });
});

describe('clicking a checkbox', () => {
  it('turns one leaf on and off again', () => {
    const draggo = leavesOf(tree).find((held) => held.key === 'enemies/draggo')!;
    expect(toggled(new Set(), draggo).has('enemies/draggo')).toBe(true);
    expect(toggled(new Set(['enemies/draggo']), draggo).size).toBe(0);
  });

  it('turns a whole group on from a group that is only partly on', () => {
    const base = groupAt(tree, 'base');
    expect([...toggled(new Set(['base/terrain']), base)].sort()).toEqual([
      'base/collision/drain',
      'base/collision/moving-platform',
      'base/collision/terrain',
      'base/terrain',
    ]);
  });

  it('clears a group only when every leaf under it was on', () => {
    const base = groupAt(tree, 'base');
    expect(toggled(new Set(keysUnder(base)), base).size).toBe(0);
  });

  it('leaves everything outside the clicked node alone', () => {
    const enemies = groupAt(tree, 'enemies');
    expect(toggled(new Set(['goodies/gem']), enemies).has('goodies/gem')).toBe(true);
  });
});

describe('searching the layers', () => {
  const found = (text: string) => leavesOf(matching(tree, text)).map((held) => held.key);

  it('keeps everything where nothing is searched for', () => {
    expect(keys(matching(tree, '   '))).toEqual(keys(tree));
  });

  it('keeps the leaves whose name carries the text, whatever its case', () => {
    expect(found('draggo')).toEqual(['enemies/draggo']);
    expect(found('DRAG')).toEqual(['enemies/draggo']);
  });

  it('keeps a whole group whose own name matches', () => {
    expect(found('collision')).toEqual([
      'base/collision/terrain',
      'base/collision/drain',
      'base/collision/moving-platform',
    ]);
  });

  it('keeps a group for the sake of the children that match, and only those', () => {
    expect(keys(matching(tree, 'gem'))).toEqual(['goodies']);
    expect(found('gem')).toEqual(['goodies/gem']);
  });

  it('answers with nothing where nothing matches', () => {
    expect(matching(tree, 'zzz')).toEqual([]);
  });

  it('leaves the keys alone, so what it shows can still be ticked', () => {
    const gems = leavesOf(matching(tree, 'gem'))[0]!;
    expect(gems.ids).toEqual(['gem-00', 'gem-01']);
  });
});

describe('finding a node by key', () => {
  it('finds a group nested under another group', () => {
    expect(nodeByKey(tree, 'base/collision')?.label).toBe('Collision');
  });

  it('finds a top-level group', () => {
    expect(nodeByKey(tree, 'enemies')?.label).toBe('Enemies');
  });

  it('answers undefined for a key the map has no node for', () => {
    expect(nodeByKey(tree, 'goodies/silver')).toBeUndefined();
  });
});

describe('the commands', () => {
  it('names every group, however deep, for collapsing them all', () => {
    expect(groupKeys(tree)).toEqual([
      'base',
      'base/collision',
      'goodies',
      'goodies/gold',
      'enemies',
      'mechanisms',
      'markers',
    ]);
  });

  it('turns on every leaf it is handed and leaves the rest as they were', () => {
    const on = setAll(new Set(['enemies/draggo']), [groupAt(tree, 'base')], true);
    expect(on.has('enemies/draggo')).toBe(true);
    expect(on.has('base/collision/terrain')).toBe(true);
  });

  it('turns off every leaf it is handed and leaves the rest as they were', () => {
    const on = setAll(defaultKeys(tree), [groupAt(tree, 'enemies')], false);
    expect(on.has('enemies/draggo')).toBe(false);
    expect(on.has('goodies/gem')).toBe(true);
  });

  it('acts on what the search leaves visible, which is what scopes select and deselect', () => {
    const on = setAll(new Set(), matching(tree, 'gem'), true);
    expect([...on]).toEqual(['goodies/gem']);
  });
});

describe('the Info Overlays group', () => {
  const withLinks = (...tags: string[]) =>
    buildLevelLayers(level('water', { drain: [[0, 0]] }, tags.map(link)), catalog);

  it('names its leaves as the Explorer names them, last of all the groups', () => {
    const tree = withLinks('substage-2-amber', 'bonus-1-green');
    expect(keys(tree).at(-1)).toBe('info');
    expect(groupAt(tree, 'info').label).toBe('Info Overlays');
    expect(leavesOf([groupAt(tree, 'info')]).map((leaf) => leaf.label)).toEqual([
      'Bonus Destination Info',
      'Exit Destination Info',
    ]);
  });

  it('counts the exits each leaf covers, not the labels they carry', () => {
    const tree = withLinks('substage-2-amber', 'substage-2-amber', 'bonus-1-green');
    const info = groupAt(tree, 'info');
    expect(info.count).toBe(3);
    expect(leavesOf([info]).map((leaf) => leaf.count)).toEqual([1, 2]);
  });

  it('switches one layer per label, however many exits carry it', () => {
    const tree = withLinks('substage-2-amber', 'substage-2-amber');
    expect(nodeByKey(tree, 'info/exit')).toMatchObject({ ids: ['tag:substage-2-amber'] });
  });

  // A drain is the bonus system's door in both directions, so the label it carries on the way back names a
  // substage and is still switched by the bonus leaf.
  it('files a label by the marker that carries it, not by what the label says', () => {
    const tree = withLinks('substage-1-green');
    expect(keysUnder(groupAt(tree, 'info'))).toEqual(['info/bonus']);
  });

  it('offers only the leaf a level has exits for', () => {
    expect(keysUnder(groupAt(withLinks('level-complete-red'), 'info'))).toEqual(['info/exit']);
  });

  it('opens with both leaves off, so a map opens on the art rather than on our words over it', () => {
    const tree = withLinks('substage-2-amber', 'bonus-1-green');
    expect(defaultKeys(tree)).not.toContain('info/exit');
    expect(defaultKeys(tree)).not.toContain('info/bonus');
  });

  it('gives no group at all to a level with no exits', () => {
    expect(keys(buildLevelLayers(level('water', { drain: [[0, 0]] }), catalog))).not.toContain('info');
  });
});

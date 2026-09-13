import { describe, expect, it } from 'vitest';

import {
  MAX_FILTERS,
  addFilter,
  buildFields,
  fieldGroups,
  matches,
  newFilter,
  operatorsFor,
  passes,
  refield,
  subjectsOf,
  takesValue,
} from './filters';
import type { Field, Filter, Operator, Subject } from './filters';
import type { Catalog, LevelIndex } from './types';

const drawn = { sprite: 'x.webp', w: 1, h: 1 };

const catalog = {
  build: { exe: { name: 'MAIN.EXE', size: 1, sha256: 'a' }, exported: 'now', id: 'b' },
  block: [320, 200] as [number, number],
  groups: [
    { id: 'goodies', label: 'Goodies' },
    { id: 'enemies', label: 'Enemies' },
    { id: 'decor', label: 'Decor' },
    { id: 'markers', label: 'Markers' },
  ],
  subs: [
    { id: 'gold', label: 'Gold', group: 'goodies' },
    { id: 'gem', label: 'Gem', group: 'goodies' },
  ],
  types: {
    shovel: { label: 'Shovel', group: 'goodies', sub: 'gold', ...drawn },
    torch: { label: 'Torch', group: 'goodies', sub: 'gold', ...drawn },
    'gem-00': { label: 'Gem', group: 'goodies', sub: 'gem', ...drawn },
    'gem-01': { label: 'Gem', group: 'goodies', sub: 'gem', ...drawn },
    draggo: { label: 'Draggo', group: 'enemies', ...drawn },
    rocker: { label: 'Rocker', group: 'enemies', ...drawn },
    vine: { label: 'Vine (gold)', group: 'decor', ...drawn },
    drain: { label: 'Drain', group: 'markers', ...drawn },
  },
  signs: {},
  tags: {},
} satisfies Catalog;

const index = {
  worlds: [
    { n: 1, name: 'Dry Lands' },
    { n: 2, name: 'Great Waters' },
  ],
  nodes: [
    { w: 1, l: 1, name: 'Warm Up Run' },
    { w: 2, l: 1, name: 'Deep Water Run' },
  ],
  maps: [
    {
      id: '1-1-1',
      label: 'Substage 1',
      bonus: false,
      bonuses: 1,
      size: [1280, 500] as [number, number],
      counts: { draggo: 3, 'gem-00': 4, 'gem-01': 1, shovel: 2 },
    },
    {
      id: '1-1-2',
      label: 'Bonus 1',
      bonus: true,
      size: [320, 200] as [number, number],
      counts: { rocker: 1 },
    },
    {
      id: '2-1-1',
      label: 'Substage 1',
      bonus: false,
      size: [640, 400] as [number, number],
      counts: { draggo: 1, vine: 6 },
    },
  ],
} satisfies LevelIndex;

const fields = new Map(buildFields(catalog, index).map((field) => [field.id, field]));
const subjects = subjectsOf(index);

const field = (id: string): Field => {
  const found = fields.get(id);
  if (!found) throw new Error(`no field ${id}`);
  return found;
};

const subject = (id: string): Subject => subjects.get(id)!;

/** Which maps answer yes to one condition, which is what every operator test below asserts on. */
const kept = (id: string, op: Operator, value: number | string = 0): string[] => {
  const filter: Filter = { id: 1, field: id, op, value };
  return [...subjects.keys()].filter((map) => passes(filter, field(id), subject(map)));
};

describe('the field list', () => {
  it('offers the level its own properties, under a group the catalog does not have', () => {
    expect([...fields.values()].filter((entry) => entry.group === 'level').map((entry) => entry.label)).toEqual(
      [
        'World',
        'Is a bonus zone',
        'Width',
        'Height',
        'Substages in the level',
        'Bonus zones it leads to',
      ],
    );
  });

  it('leaves out the groups nothing asks a level about, markers and decor alike', () => {
    expect(fields.has('drain')).toBe(false);
    expect(fields.has('vine')).toBe(false);
    for (const group of ['markers', 'decor']) {
      expect([...fields.values()].some((entry) => entry.group === group), group).toBe(false);
    }
  });

  it('lists a divided group as its divisions, since a drop-down cannot nest', () => {
    expect(fieldGroups(catalog)).toEqual([
      { id: 'level', label: 'Level / Map' },
      { id: 'gold', label: 'Gold Goodies' },
      { id: 'gem', label: 'Gems' },
      { id: 'enemies', label: 'Enemies' },
    ]);
    expect(field('shovel').group).toBe('gold');
    expect(field('sub:gem').group).toBe('gem');
    expect([...fields.values()].some((entry) => entry.group === 'goodies')).toBe(false);
  });

  it('makes one field of a subgroup whose types all carry one name', () => {
    expect(fields.has('gem-00')).toBe(false);
    expect(field('sub:gem').label).toBe('Gem');
    expect(field('sub:gem').read(subject('1-1-1'))).toBe(5);
  });

  it('counts a subgroup that does break down whole, and its types apart', () => {
    expect(field('sub:gold').label).toBe('Any gold');
    expect(fields.has('shovel')).toBe(true);
    expect(fields.has('torch')).toBe(true);
  });

  it('counts a whole group only where the group is one a person asks about', () => {
    expect(field('group:enemies').label).toBe('Any enemy');
    expect(field('group:enemies').read(subject('1-1-1'))).toBe(3);
    expect(fields.has('group:goodies')).toBe(false);
  });

  it('lists a heading alphabetically, its aggregate included', () => {
    const gold = [...fields.values()].filter((entry) => entry.group === 'gold');
    expect(gold.map((entry) => entry.label)).toEqual(['Any gold', 'Shovel', 'Torch']);
  });

  it('offers no field for a type no level places', () => {
    expect(fields.has('nirpling')).toBe(false);
  });
});

describe('what a map is reduced to', () => {
  it('counts the substages of the level a map belongs to, not of the world', () => {
    expect(subject('1-1-1').substages).toBe(1);
    expect(subject('2-1-1').substages).toBe(1);
  });

  it('reads how many bonus zones a map leads to off that map, never off its level', () => {
    expect(subject('1-1-1').bonuses).toBe(1);
    // The bonus zone itself leads nowhere, though the level it belongs to does hold one.
    expect(subject('1-1-2').bonuses).toBe(0);
    expect(subject('2-1-1').bonuses).toBe(0);
  });

  it('reads the world out of the map id', () => {
    expect(subject('2-1-1').world).toBe(2);
  });

  it('reads the world a level is shown under, not the one its id numbers it in', () => {
    // The boss arena's shape: numbered under one world, displayed under another.
    const displaced = subjectsOf({
      worlds: [
        { n: 1, name: 'Dry Lands' },
        { n: 2, name: 'Great Waters' },
      ],
      nodes: [{ w: 1, l: 9, name: 'Spurkasaur Lair', show: 2 }],
      maps: [
        {
          id: '1-9-1',
          label: 'Substage 1',
          bonus: false,
          size: [800, 220] as [number, number],
          counts: {},
        },
      ],
    } satisfies LevelIndex);
    expect(displaced.get('1-9-1')!.world).toBe(2);
  });
});

describe('the operators', () => {
  it('gives a countable field four and a closed field two', () => {
    expect(operatorsFor('count')).toEqual(['at-least', 'at-most', 'exactly', 'none']);
    expect(operatorsFor('choice')).toEqual(['is', 'is-not']);
    expect(operatorsFor('flag')).toEqual(['is', 'is-not']);
  });

  it('asks for a value only where the sentence has a third part', () => {
    expect(takesValue('count', 'at-least')).toBe(true);
    expect(takesValue('count', 'none')).toBe(false);
    expect(takesValue('flag', 'is')).toBe(false);
    expect(takesValue('choice', 'is')).toBe(true);
  });

  it('keeps a map holding at least that many', () => {
    expect(kept('draggo', 'at-least', 3)).toEqual(['1-1-1']);
    expect(kept('draggo', 'at-least', 1)).toEqual(['1-1-1', '2-1-1']);
  });

  it('keeps a map holding at most that many, none of them included', () => {
    expect(kept('draggo', 'at-most', 1)).toEqual(['1-1-2', '2-1-1']);
  });

  it('keeps a map holding exactly that many', () => {
    expect(kept('draggo', 'exactly', 1)).toEqual(['2-1-1']);
    expect(kept('draggo', 'exactly', 0)).toEqual(['1-1-2']);
  });

  it('keeps a map holding none at all, which is how absence is asked for', () => {
    expect(kept('draggo', 'none')).toEqual(['1-1-2']);
    expect(kept('sub:gem', 'none')).toEqual(['1-1-2', '2-1-1']);
  });

  it('keeps a map whose closed choice is that one, and the other way round', () => {
    expect(kept('world', 'is', '2')).toEqual(['2-1-1']);
    expect(kept('world', 'is-not', '2')).toEqual(['1-1-1', '1-1-2']);
  });

  it('reads a yes-or-no field off the operator alone, with no value beside it', () => {
    expect(kept('bonus', 'is')).toEqual(['1-1-2']);
    expect(kept('bonus', 'is-not')).toEqual(['1-1-1', '2-1-1']);
  });

  it('never asks a bonus zone about a level\'s shape, whatever the operator', () => {
    expect(kept('substages', 'at-least', 1)).toEqual(['1-1-1', '2-1-1']);
    expect(kept('substages', 'exactly', 1)).toEqual(['1-1-1', '2-1-1']);
    // Not even the readings a bonus zone would otherwise satisfy: it is not a map either field is about.
    expect(kept('substages', 'none')).toEqual([]);
    expect(kept('bonuses', 'none')).toEqual(['2-1-1']);
    expect(kept('bonuses', 'exactly', 1)).toEqual(['1-1-1']);
  });

  it('counts a dimension the same way it counts objects', () => {
    expect(kept('width', 'at-least', 640)).toEqual(['1-1-1', '2-1-1']);
    expect(kept('height', 'at-most', 200)).toEqual(['1-1-2']);
  });
});

describe('stacking', () => {
  const stack = (filters: Filter[]) =>
    [...subjects.keys()].filter((map) => matches(filters, fields, subject(map)));

  it('combines with and, so every condition has to hold', () => {
    expect(
      stack([
        { id: 1, field: 'draggo', op: 'at-least', value: 1 },
        { id: 2, field: 'sub:gem', op: 'at-least', value: 5 },
      ]),
    ).toEqual(['1-1-1']);
  });

  it('narrows rather than widens as conditions are added', () => {
    const one: Filter[] = [{ id: 1, field: 'world', op: 'is', value: '1' }];
    const two: Filter[] = [...one, { id: 2, field: 'bonus', op: 'is', value: '' }];
    expect(stack(one)).toEqual(['1-1-1', '1-1-2']);
    expect(stack(two)).toEqual(['1-1-2']);
  });

  it('answers a combination nothing satisfies with nothing, which is an answer', () => {
    expect(
      stack([
        { id: 1, field: 'draggo', op: 'at-least', value: 1 },
        { id: 2, field: 'draggo', op: 'none', value: 0 },
      ]),
    ).toEqual([]);
  });

  it('keeps every map when there is no condition at all', () => {
    expect(stack([])).toEqual(['1-1-1', '1-1-2', '2-1-1']);
  });

  it('keeps no map for a condition naming a field that does not exist', () => {
    expect(stack([{ id: 1, field: 'nirpling', op: 'at-least', value: 1 }])).toEqual([]);
  });
});

describe('adding a row', () => {
  const fill = (many: number) => {
    let held: Filter[] = [];
    for (let i = 0; i < many; i += 1) held = addFilter(held, field('draggo'));
    return held;
  };

  it('appends one condition on the field it is given', () => {
    expect(addFilter([], field('draggo'))).toEqual([
      { id: 1, field: 'draggo', op: 'at-least', value: 1 },
    ]);
  });

  it('gives every row an identity of its own, including after one is removed', () => {
    const three = fill(3);
    const left = three.filter((filter) => filter.id !== 2);
    const ids = addFilter(left, field('rocker')).map((filter) => filter.id);
    expect([...new Set(ids)].length).toBe(ids.length);
  });

  it('stops at twenty conditions, leaving the twenty already there untouched', () => {
    const full = fill(MAX_FILTERS);
    expect(full.length).toBe(20);
    expect(addFilter(full, field('rocker'))).toEqual(full);
  });

  it('adds the twentieth, which is the one before the ceiling', () => {
    expect(addFilter(fill(MAX_FILTERS - 1), field('rocker')).length).toBe(MAX_FILTERS);
  });
});

describe('editing a row', () => {
  it('opens a countable field at the reading asked for most', () => {
    expect(newFilter(field('draggo'), 7)).toEqual({ id: 7, field: 'draggo', op: 'at-least', value: 1 });
  });

  it('opens a closed field on its first value', () => {
    expect(newFilter(field('world'), 7)).toEqual({ id: 7, field: 'world', op: 'is', value: '1' });
  });

  it('carries the reading across two countable fields', () => {
    const was: Filter = { id: 7, field: 'draggo', op: 'at-most', value: 3 };
    expect(refield(was, field('draggo'), field('rocker'))).toEqual({
      id: 7,
      field: 'rocker',
      op: 'at-most',
      value: 3,
    });
  });

  it('starts over where the new field is not read the same way', () => {
    const was: Filter = { id: 7, field: 'draggo', op: 'at-most', value: 3 };
    expect(refield(was, field('draggo'), field('world'))).toEqual({
      id: 7,
      field: 'world',
      op: 'is',
      value: '1',
    });
  });
});

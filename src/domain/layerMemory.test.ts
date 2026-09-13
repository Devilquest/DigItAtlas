import { describe, expect, it } from 'vitest';

import { ALL_LAYERS, record, resolve, spokenFor } from './layerMemory';
import type { LayerMemory } from './layerMemory';
import type { LayerGroup, LayerLeaf, LayerNode } from './layerTree';

const leaf = (key: string, on: boolean): LayerLeaf => ({ kind: 'leaf', key, label: key, ids: [key], on });

const group = (key: string, children: LayerNode[]): LayerGroup => ({
  kind: 'group',
  key,
  label: key,
  children,
});

/** A level with a moving platform, so its collision group holds a footprint as well as the plane. */
const withPlatform: LayerNode[] = [
  group('base', [
    leaf('base/terrain', true),
    group('base/collision', [
      leaf('base/collision/terrain', false),
      leaf('base/collision/moving-platform', false),
    ]),
  ]),
  group('enemies', [leaf('enemies/draggo', true), leaf('enemies/rocker', true)]),
];

/** A level with none, which is where a statement about the group above it is made. */
const withoutPlatform: LayerNode[] = [
  group('base', [
    leaf('base/terrain', true),
    group('base/collision', [leaf('base/collision/terrain', false)]),
  ]),
  group('enemies', [leaf('enemies/draggo', true)]),
];

const said = (...statements: Array<[string, boolean, number]>): LayerMemory =>
  Object.fromEntries(statements.map(([key, on, at]) => [key, { on, at }]));

describe('a map nothing has been said about', () => {
  it('opens every leaf on its own default', () => {
    expect([...resolve(withPlatform, {})].sort()).toEqual([
      'base/terrain',
      'enemies/draggo',
      'enemies/rocker',
    ]);
  });
});

describe('what governs one layer', () => {
  it('is its own statement, where it is the only one', () => {
    expect(resolve(withPlatform, said(['enemies/draggo', false, 1])).has('enemies/draggo')).toBe(false);
  });

  it('is a statement about a group above it, where the layer has none', () => {
    const on = resolve(withPlatform, said(['base/collision', true, 1]));
    expect(on.has('base/collision/terrain')).toBe(true);
    expect(on.has('base/collision/moving-platform')).toBe(true);
  });

  it('reaches a layer that was not on screen when the group was pressed', () => {
    // Pressing Collision on a level that has no platform, then opening one that has.
    const pressed = record({}, ['base/collision'], true);
    expect(resolve(withoutPlatform, pressed).has('base/collision/terrain')).toBe(true);
    expect(resolve(withPlatform, pressed).has('base/collision/moving-platform')).toBe(true);
  });

  it('is whichever was said last, when a group and a layer disagree', () => {
    const groupLast = said(['enemies/draggo', true, 1], ['enemies', false, 2]);
    expect(resolve(withPlatform, groupLast).has('enemies/draggo')).toBe(false);

    const leafLast = said(['enemies', false, 1], ['enemies/draggo', true, 2]);
    expect(resolve(withPlatform, leafLast).has('enemies/draggo')).toBe(true);
  });

  it('is the group pressed last, not the innermost one', () => {
    // Collision turned on earlier, then Base turned off on a level that showed no collision at all.
    const memory = said(['base/collision', true, 1], ['base', false, 2]);
    expect(resolve(withPlatform, memory).has('base/collision/terrain')).toBe(false);
  });

  it('is a statement about every layer there is, where nothing nearer was said', () => {
    const memory = said([ALL_LAYERS, false, 1]);
    expect(resolve(withPlatform, memory).size).toBe(0);
  });

  it('lets a later statement about one layer outlive one about every layer', () => {
    const memory = said([ALL_LAYERS, false, 1], ['enemies/draggo', true, 2]);
    expect([...resolve(withPlatform, memory)]).toEqual(['enemies/draggo']);
  });
});

describe('recording what was said', () => {
  it('gives every key of one action the same moment', () => {
    const memory = record({}, ['enemies', 'base'], false);
    expect(memory['enemies']?.at).toBe(memory['base']?.at);
  });

  it('makes each action later than every one before it', () => {
    const first = record({}, ['enemies'], false);
    const second = record(first, ['base'], true);
    expect(second['base']!.at).toBeGreaterThan(second['enemies']!.at);
  });

  it('says nothing where there was nothing to say', () => {
    expect(record({}, [], true)).toEqual({});
  });
});

describe('what a wholesale command speaks for', () => {
  const every = new Set([
    'base/terrain',
    'base/collision/terrain',
    'base/collision/moving-platform',
    'enemies/draggo',
    'enemies/rocker',
  ]);

  it('speaks for every layer there is when it reached the whole map', () => {
    expect(spokenFor(withPlatform, every)).toEqual([ALL_LAYERS]);
  });

  it('speaks for a group it emptied or filled entirely', () => {
    expect(spokenFor(withPlatform, new Set(['enemies/draggo', 'enemies/rocker']))).toEqual(['enemies']);
  });

  it('speaks for the layers rather than the group it only half reached', () => {
    expect(spokenFor(withPlatform, new Set(['enemies/draggo']))).toEqual(['enemies/draggo']);
  });

  it('speaks for the innermost group it filled, not the one above it', () => {
    const covered = new Set(['base/collision/terrain', 'base/collision/moving-platform']);
    expect(spokenFor(withPlatform, covered)).toEqual(['base/collision']);
  });

  it('says nothing at all where it reached nothing', () => {
    expect(spokenFor(withPlatform, new Set())).toEqual([]);
  });
});

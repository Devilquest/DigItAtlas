import { describe, expect, it } from 'vitest';

import { parsePreferences, serializePreferences } from './preferences';

describe('reading stored preferences', () => {
  it('takes what was stored', () => {
    const raw = JSON.stringify({ v: 1, panels: { levels: false, layers: false, minimap: false }, open: ['w1', 'l1-1'] });
    expect(parsePreferences(raw)).toEqual({
      panels: { levels: false, layers: false, minimap: false },
      open: ['w1', 'l1-1'],
      collapsed: [],
      layers: {},
    });
  });

  it('opens every panel and expands nothing for a visitor with nothing stored', () => {
    expect(parsePreferences(null)).toEqual({
      panels: { levels: true, layers: true, minimap: true },
      open: [],
      collapsed: [],
      layers: {},
    });
  });

  it('discards a stored shape from another version rather than reading it', () => {
    const older = JSON.stringify({ v: 0, panels: { levels: false, layers: false, minimap: false }, open: ['w1'] });
    expect(parsePreferences(older)).toEqual({
      panels: { levels: true, layers: true, minimap: true },
      open: [],
      collapsed: [],
      layers: {},
    });
  });

  it('discards what it cannot parse, and what parses to the wrong kind of thing', () => {
    for (const wrong of ['', 'not json', '[]', 'null', '42', '"text"']) {
      expect(parsePreferences(wrong), wrong).toEqual({
        panels: { levels: true, layers: true, minimap: true },
        open: [],
        collapsed: [],
        layers: {},
      });
    }
  });

  it('keeps the fields it understands and defaults the rest', () => {
    expect(parsePreferences(JSON.stringify({ v: 1, panels: { levels: false } }))).toEqual({
      panels: { levels: false, layers: true, minimap: true },
      open: [],
      collapsed: [],
      layers: {},
    });
    expect(parsePreferences(JSON.stringify({ v: 1, open: ['w2'] }))).toEqual({
      panels: { levels: true, layers: true, minimap: true },
      open: ['w2'],
      collapsed: [],
      layers: {},
    });
    expect(
      parsePreferences(JSON.stringify({ v: 1, panels: { levels: 'yes', layers: 'no', minimap: 'no' }, open: 'w2' })),
    ).toEqual({
      panels: { levels: true, layers: true, minimap: true },
      open: [],
      collapsed: [],
      layers: {},
    });
  });

  it('drops the entries of a branch list that are not keys', () => {
    const raw = JSON.stringify({ v: 1, panels: { levels: true, layers: true, minimap: true }, open: ['w1', 7, null, 'l1-1'] });
    expect(parsePreferences(raw).open).toEqual(['w1', 'l1-1']);
  });

  it('reads back what it writes', () => {
    const chosen = {
      panels: { levels: false, layers: true, minimap: true },
      open: ['w3', 'l3-2'],
      collapsed: ['enemies'],
      layers: { 'base/collision': { on: true, at: 4 } },
    };
    expect(parsePreferences(serializePreferences(chosen))).toEqual(chosen);
  });

  it('stores the version, so that a later shape can tell this one apart', () => {
    expect(
      JSON.parse(
        serializePreferences({
          panels: { levels: true, layers: true, minimap: true },
          open: [],
          collapsed: [],
          layers: {},
        }),
      ).v,
    ).toBe(1);
  });
});

describe('reading what was said about the layers', () => {
  const stored = (layers: unknown) =>
    parsePreferences(JSON.stringify({ v: 1, layers })).layers;

  it('takes a statement that says whether and when', () => {
    expect(stored({ enemies: { on: false, at: 3 } })).toEqual({ enemies: { on: false, at: 3 } });
  });

  it('drops an entry that is not one, rather than trusting it', () => {
    expect(
      stored({
        good: { on: true, at: 1 },
        missing: { on: true },
        wrong: { on: 'yes', at: 2 },
        infinite: { on: true, at: Number.POSITIVE_INFINITY },
        empty: null,
      }),
    ).toEqual({ good: { on: true, at: 1 } });
  });

  it('remembers nothing where what was stored is not a set of statements', () => {
    for (const wrong of [[], 'text', 7]) expect(stored(wrong)).toEqual({});
  });
});

import { describe, expect, it } from 'vitest';

import { DEFAULT_ROUTE, linkDestination, nodeDestination, parseRoute, routeToHash, sameRoute } from './route';
import type { Route } from './route';
import type { Link, WorldNode } from './types';

describe('reading an address', () => {
  it('reads a level', () => {
    expect(parseRoute('#/1-1-1')).toEqual({ kind: 'level', id: '1-1-1' });
    expect(parseRoute('#/4-16-1')).toEqual({ kind: 'level', id: '4-16-1' });
  });

  it('reads a world map', () => {
    expect(parseRoute('#/map/2')).toEqual({ kind: 'world', n: 2 });
    expect(parseRoute('#/map/5')).toEqual({ kind: 'world', n: 5 });
  });

  it('reads the levels whose numbering is irregular', () => {
    // The overflow blocks continue past nine, and one level is numbered under a different world than it
    // is shown under. Neither is special here: the id is the id.
    expect(parseRoute('#/3-12-5')).toEqual({ kind: 'level', id: '3-12-5' });
    expect(parseRoute('#/1-10-1')).toEqual({ kind: 'level', id: '1-10-1' });
  });

  it('does not mind how the fragment is punctuated', () => {
    for (const written of ['#/1-1-1', '/1-1-1', '1-1-1', '#/1-1-1/']) {
      expect(parseRoute(written), written).toEqual({ kind: 'level', id: '1-1-1' });
    }
  });

  it('opens the first world map when no address was given', () => {
    // Written out rather than compared against DEFAULT_ROUTE, which would move with the value it pins.
    for (const empty of ['', '#', '#/', '/']) {
      expect(parseRoute(empty), JSON.stringify(empty)).toEqual({ kind: 'world', n: 1 });
    }
    expect(DEFAULT_ROUTE).toEqual({ kind: 'world', n: 1 });
  });

  it('reports an address it does not understand rather than guessing at one', () => {
    for (const wrong of ['#/nonsense', '#/1-1', '#/1-1-1-1', '#/map', '#/map/x', '#/levels/1-1-1']) {
      expect(parseRoute(wrong).kind, wrong).toBe('unknown');
    }
  });

  it('normalizes the digits, so two spellings of one level are one address', () => {
    expect(parseRoute('#/01-01-01')).toEqual({ kind: 'level', id: '1-1-1' });
  });
});

describe('writing an address', () => {
  it.each<Route>([
    { kind: 'level', id: '1-1-1' },
    { kind: 'level', id: '4-16-1' },
    { kind: 'world', n: 3 },
    { kind: 'unknown', raw: 'nonsense' },
  ])('survives a round trip: %j', (route) => {
    expect(parseRoute(routeToHash(route))).toEqual(route);
  });

  it('writes the shapes the design fixes', () => {
    expect(routeToHash({ kind: 'level', id: '2-6-3' })).toBe('#/2-6-3');
    expect(routeToHash({ kind: 'world', n: 4 })).toBe('#/map/4');
  });
});

describe('where a link leads', () => {
  const link = (to: string | null): Link =>
    ({ at: [0, 0], to, label: 'irrelevant', tag: 'irrelevant-amber', tagAt: [0, 0] });

  it('opens the level a link names', () => {
    expect(linkDestination(link('1-1-3'), 1)).toEqual({ kind: 'level', id: '1-1-3' });
  });

  it('returns to the world map when the link ends the level', () => {
    expect(linkDestination(link(null), 3)).toEqual({ kind: 'world', n: 3 });
  });
});

describe('where a world node leads', () => {
  const node = (extra: Partial<WorldNode>): WorldNode => ({ at: [0, 0], label: 'irrelevant', ...extra });

  it('opens the level a level node names', () => {
    expect(nodeDestination(node({ sign: 'level', to: '1-1-1' }))).toEqual({ kind: 'level', id: '1-1-1' });
  });

  it('opens the world a gate names', () => {
    expect(nodeDestination(node({ sign: 'gate', world: 2 }))).toEqual({ kind: 'world', n: 2 });
  });

  it('leads nowhere for a checkpoint or a trace, which are places rather than destinations', () => {
    expect(nodeDestination(node({ sign: 'checkpoint' }))).toBeUndefined();
    expect(nodeDestination(node({ sign: 'trace' }))).toBeUndefined();
  });
});

describe('comparing two routes', () => {
  it('agrees a level with itself, and no other level', () => {
    expect(sameRoute({ kind: 'level', id: '1-1-1' }, { kind: 'level', id: '1-1-1' })).toBe(true);
    expect(sameRoute({ kind: 'level', id: '1-1-1' }, { kind: 'level', id: '1-1-2' })).toBe(false);
  });

  it('agrees a world map with itself, and no other world', () => {
    expect(sameRoute({ kind: 'world', n: 1 }, { kind: 'world', n: 1 })).toBe(true);
    expect(sameRoute({ kind: 'world', n: 1 }, { kind: 'world', n: 2 })).toBe(false);
  });

  it('never agrees a level with a world map', () => {
    expect(sameRoute({ kind: 'level', id: '1-1-1' }, { kind: 'world', n: 1 })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';

import { routeToHash } from '../domain/route';
import type { Route } from '../domain/route';
import { makeAhead } from './ahead';
import type { Opened } from './loader';

const at = (id: string): Route => ({ kind: 'level', id });

/** A fetcher that records what it was asked for and lands each map only when the test says so. */
function fake() {
  const asked: string[] = [];
  const landing: Array<() => void> = [];
  const fetch = (route: Route) => {
    asked.push(route.kind === 'level' ? route.id : routeToHash(route));
    return new Promise<{ ok: true; value: Opened }>((resolve) => {
      landing.push(() => resolve({ ok: true, value: {} as Opened }));
    });
  };
  const land = async () => {
    landing.shift()?.();
    await settle();
  };
  return { asked, land, ahead: makeAhead(fetch) };
}

/** Lets every promise already resolved run, which is what a walk takes to reach its next map. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('the maps fetched ahead of a click', () => {
  it('walks one map at a time, so a click is never queued behind a whole level', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2'), at('1-1-3'), at('1-1-4')]);
    await settle();
    expect(asked).toEqual(['1-1-2']);
    await land();
    expect(asked).toEqual(['1-1-2', '1-1-3']);
    await land();
    expect(asked).toEqual(['1-1-2', '1-1-3', '1-1-4']);
  });

  it('starts nothing further once the visitor has left the level', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2'), at('1-1-3'), at('1-1-4')]);
    await settle();
    ahead.prefetch([at('2-1-2')]);
    await land();
    expect(asked).toEqual(['1-1-2', '2-1-2']);
  });

  it('opens a map the walk already brought in without fetching anything', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    await land();
    await ahead.open(at('1-1-2'));
    expect(asked).toEqual(['1-1-2']);
  });

  it('fetches nothing on a second visit to the same level', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    await land();
    ahead.prefetch([at('1-1-1')]);
    await settle();
    await land();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    expect(asked).toEqual(['1-1-2', '1-1-1']);
  });

  it('keeps what an earlier level loaded, so coming back to it fetches nothing', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    await land();
    ahead.prefetch([at('2-1-2')]);
    await settle();
    await land();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    expect(asked).toEqual(['1-1-2', '2-1-2']);
  });

  it('does not start a second fetch for a map the walk is already fetching', async () => {
    const { asked, ahead } = fake();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    void ahead.open(at('1-1-2'));
    await settle();
    expect(asked).toEqual(['1-1-2']);
  });

  it('keeps a map that landed after the visitor left, those bytes being paid for either way', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    ahead.prefetch([at('2-1-2')]);
    await land();
    void ahead.open(at('1-1-2'));
    await settle();
    expect(asked).toEqual(['1-1-2', '2-1-2']);
  });

  it('queues nothing from a screen that has nothing one click away, and drops nothing either', async () => {
    const { asked, land, ahead } = fake();
    ahead.prefetch([at('1-1-2')]);
    await settle();
    await land();
    ahead.prefetch([]);
    await settle();
    void ahead.open(at('1-1-2'));
    await settle();
    expect(asked).toEqual(['1-1-2']);
  });
});

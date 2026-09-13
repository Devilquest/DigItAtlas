/** Tier 2: the maps one click away, fetched before they are asked for, and the store that keeps them. */
import { oneClickAway } from '../domain/levels';
import { routeToHash } from '../domain/route';
import type { Route } from '../domain/route';
import type { Fetched } from './client';
import { atlasFiles, sceneFor } from './loader';
import type { Opened } from './loader';

/** The maps a visit has ready, and the walk that fills them in behind the one on screen. */
export interface Ahead {
  /** Opens a map, from the store where it has already been loaded and from the fetcher where it has not. */
  open(route: Route): Promise<Fetched<Opened>>;
  /** Fetches these one at a time, in place of whatever the last map left queued. */
  prefetch(routes: Route[]): void;
}

/** Builds the store over a fetcher, so the walk can be driven without a network. */
export function makeAhead(fetch: (route: Route) => Promise<Fetched<Opened>>): Ahead {
  const kept = new Map<string, Opened>();
  const running = new Map<string, Promise<Fetched<Opened>>>();
  let queue: Route[] = [];
  let walking = false;

  const start = (route: Route): Promise<Fetched<Opened>> => {
    const key = routeToHash(route);
    // One fetch per address however many ask for it, so a click on a map the walk is already fetching waits
    // for that one rather than starting a second.
    const already = running.get(key);
    if (already) return already;
    const opened = fetch(route).then((result) => {
      running.delete(key);
      // Kept whenever it arrives, the visitor having moved on included.
      if (result.ok) kept.set(key, result.value);
      return result;
    });
    running.set(key, opened);
    return opened;
  };

  const walk = async (): Promise<void> => {
    walking = true;
    // One map at a time, so a click landing mid-walk is never queued behind a level's worth of pictures.
    for (let next = queue.shift(); next; next = queue.shift()) {
      if (!kept.has(routeToHash(next))) await start(next);
    }
    walking = false;
  };

  return {
    open(route) {
      const already = kept.get(routeToHash(route));
      if (already) return Promise.resolve<Fetched<Opened>>({ ok: true, value: already });
      return start(route);
    },
    prefetch(routes) {
      queue = routes.filter((route) => !kept.has(routeToHash(route)));
      if (!walking) void walk();
    },
  };
}

const maps = makeAhead(sceneFor);

/** Opens a map, waiting for nothing where the walk has already brought it in. */
export const openMap = (route: Route): Promise<Fetched<Opened>> => maps.open(route);

/** Fetches the maps one click from the one now on screen, which is nothing at all from a world map. */
export async function prefetchAround(route: Route): Promise<void> {
  const ready = await atlasFiles();
  if (ready.ok) maps.prefetch(oneClickAway(ready.value.index, route));
}

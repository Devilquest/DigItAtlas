/** The address bar, read and written: `#/1-1-1` for a level, `#/map/2` for a level-select screen. */
import type { Link, MapId, WorldNode } from './types';

export type Route =
  | { kind: 'level'; id: MapId }
  | { kind: 'world'; n: number }
  /** An address that names no map, which the application shows as a state rather than throwing. */
  | { kind: 'unknown'; raw: string };

/** The address shown when none was given. */
export const DEFAULT_ROUTE: Route = { kind: 'world', n: 1 };

const LEVEL = /^(\d+)-(\d+)-(\d+)$/;
const WORLD = /^map\/(\d+)$/;

/** Reads one address fragment, with or without its leading `#/`. */
export function parseRoute(fragment: string): Route {
  const path = fragment.replace(/^#/, '').replace(/^\//, '').replace(/\/$/, '');
  if (path === '') return DEFAULT_ROUTE;

  const level = LEVEL.exec(path);
  if (level) return { kind: 'level', id: `${Number(level[1])}-${Number(level[2])}-${Number(level[3])}` };

  const world = WORLD.exec(path);
  if (world) return { kind: 'world', n: Number(world[1]) };

  return { kind: 'unknown', raw: path };
}

/** Writes one route as the fragment that addresses it. */
export function routeToHash(route: Route): string {
  switch (route.kind) {
    case 'level':
      return `#/${route.id}`;
    case 'world':
      return `#/map/${route.n}`;
    case 'unknown':
      return `#/${route.raw}`;
  }
}

/** The route the browser is currently showing. */
export function currentRoute(): Route {
  return parseRoute(window.location.hash);
}

/** Calls back whenever the address changes, and returns the function that stops listening. */
export function onRouteChange(listen: (route: Route) => void): () => void {
  const handler = () => listen(currentRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}

/** Whether two routes name the same map, for highlighting which of a list of routes is on screen. */
export function sameRoute(a: Route, b: Route): boolean {
  if (a.kind === 'level' && b.kind === 'level') return a.id === b.id;
  if (a.kind === 'world' && b.kind === 'world') return a.n === b.n;
  return false;
}

/** Moves to a route, adding a history entry so that the back button returns to the last map. */
export function goTo(route: Route): void {
  const hash = routeToHash(route);
  if (window.location.hash !== hash) window.location.hash = hash;
}

/** Where a level exit leads: the world map it belongs to when the link marks the level's own end. */
export function linkDestination(link: Link, world: number): Route {
  return link.to == null ? { kind: 'world', n: world } : { kind: 'level', id: link.to };
}

/** Where a world map's node leads, absent for the checkpoint and the trace, which are places, not destinations. */
export function nodeDestination(node: WorldNode): Route | undefined {
  if (node.to != null) return { kind: 'level', id: node.to };
  if (node.world != null) return { kind: 'world', n: node.world };
  return undefined;
}

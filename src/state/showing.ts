/** What the shell has on screen, and what stays there while the next map is on its way. */
import type { Trouble } from '../data/client';
import type { LayerNode } from '../domain/layerTree';
import type { Route } from '../domain/route';
import type { Scene } from '../engine/renderer';

/** The loading screen, a message in place of a map, or a map and everything the window says about it. */
export type Showing =
  // `opening` holds while no map has settled yet, which is what separates a visit's first wait, the one the
  // loading screen covers, from every later wait, which happens inside the window.
  | { state: 'loading'; opening: boolean }
  | { state: 'failed'; trouble: Trouble }
  | { state: 'map'; route: Route; scene: Scene; title: string; layers: LayerNode[] };

/** Where a visit begins: the loading screen, with nothing settled behind it. */
export const OPENING: Showing = { state: 'loading', opening: true };

/** What is shown while a map loads: the one already drawn, or a wait where there is none. */
export function whileLoading(was: Showing): Showing {
  if (was.state === 'map') return was;
  return { state: 'loading', opening: was.state === 'loading' && was.opening };
}

/** The navigation tree: every map there is, in the order the Levels panel lists them. */
import { nodeKey, nodeOf, substageOf } from './mapId';
import type { Route } from './route';
import type { LevelIndex, MapId, MapSummary } from './types';

/** Whether the index carries a map at an address, which is what settles that the atlas holds one. */
export function carries(index: LevelIndex, route: Route): boolean {
  if (route.kind === 'level') return index.maps.some((map) => map.id === route.id);
  if (route.kind === 'world') return index.worlds.some((world) => world.n === route.n);
  return false;
}

/** One map a leaf opens, under the name the index gives it. */
export interface MapLeaf {
  id: MapId;
  label: string;
}

/** One named level, and the maps filed under it: its substages in order, then its bonus zones. */
export interface LevelBranch {
  world: number;
  level: number;
  name: string;
  maps: MapLeaf[];
}

/** One world, whose level-select screen the panel adds itself. */
export interface WorldBranch {
  n: number;
  name: string;
  levels: LevelBranch[];
}

/** The way through a level and then what it hides, which is the order every list of its maps takes. */
const inPanelOrder = (a: MapSummary, b: MapSummary): number =>
  Number(a.bonus) - Number(b.bonus) || substageOf(a.id) - substageOf(b.id);

/** The key a world branch is opened and closed by. */
export const worldKey = (n: number): string => `w${n}`;

/** The key a level branch is opened and closed by. */
export const levelKey = (level: LevelBranch): string => `l${level.world}-${level.level}`;

/** Builds the tree the Levels panel draws, from the index alone. */
export function buildTree(index: LevelIndex): WorldBranch[] {
  const maps = new Map<string, MapLeaf[]>();
  const listed = [...index.maps].sort(inPanelOrder);
  for (const map of listed) {
    const under = maps.get(nodeOf(map.id)) ?? [];
    under.push({ id: map.id, label: map.label });
    maps.set(nodeOf(map.id), under);
  }

  return index.worlds.map((world) => ({
    n: world.n,
    name: world.name,
    levels: index.nodes
      // A level is listed under `show` where it has one, which is not the world it is numbered in.
      .filter((node) => (node.show ?? node.w) === world.n)
      .sort((a, b) => a.w - b.w || a.l - b.l)
      .map((node) => ({
        world: node.w,
        level: node.l,
        name: node.name,
        maps: maps.get(nodeKey(node)) ?? [],
      })),
  }));
}

/** The branch keys that have to be open for one map to be on screen, or none where no leaf opens it. */
export function branchesTo(tree: WorldBranch[], id: MapId): string[] {
  for (const world of tree) {
    for (const level of world.levels) {
      if (level.maps.some((map) => map.id === id)) return [worldKey(world.n), levelKey(level)];
    }
  }
  return [];
}

/** Every key that opens something, which is what a command over the whole tree acts on. */
export function branchKeys(tree: WorldBranch[]): string[] {
  const keys: string[] = [];
  for (const world of tree) {
    keys.push(worldKey(world.n));
    // A level holding one map is a leaf in the panel, so it has nothing to open.
    for (const level of world.levels) if (level.maps.length > 1) keys.push(levelKey(level));
  }
  return keys;
}

/**
 * The maps one click from an address, in the order they are fetched ahead of that click.
 *
 * @returns The world map the level is shown under and its sibling maps, or empty for a level-select screen.
 */
export function oneClickAway(index: LevelIndex, route: Route): Route[] {
  if (route.kind !== 'level' || !index.maps.some((map) => map.id === route.id)) return [];
  const node = index.nodes.find((entry) => nodeKey(entry) === nodeOf(route.id));
  if (!node) return [];
  const siblings = index.maps
    .filter((map) => map.id !== route.id && nodeOf(map.id) === nodeOf(route.id))
    .sort(inPanelOrder);
  // The world map leads the walk: it is the cheapest of the set and the only member that is not a sibling,
  // so putting it anywhere else would queue it behind a whole level's worth of pictures.
  return [
    { kind: 'world', n: node.show ?? node.w },
    ...siblings.map((map): Route => ({ kind: 'level', id: map.id })),
  ];
}

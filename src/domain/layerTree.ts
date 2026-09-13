/** A map's layers, grouped and named the way the Layers panel lists them. */
import { drawableIn } from './types';
import type { Catalog, Level, WorldMap } from './types';

/** The scene layer the map's own picture is drawn as. */
export const TERRAIN_LAYER = 'terrain';

/** The scene layer a level's collision plane is drawn as. */
export const COLLISION_LAYER = 'collision';

/** The scene layer a world map's walk path is drawn as. */
export const PATH_LAYER = 'path';

/** The scene layer one type's collision footprint is drawn as, kept apart from the type's own layer. */
export const colliderLayer = (type: string): string => `${COLLISION_LAYER}:${type}`;

/** The scene layer one destination label is drawn as, one per label rather than one per exit. */
export const tagLayer = (tag: string): string => `tag:${tag}`;

/** One switch in the panel, and every scene layer it turns on and off together. */
export interface LayerLeaf {
  kind: 'leaf';
  key: string;
  label: string;
  ids: string[];
  on: boolean;
  count?: number;
}

/** A heading with a checkbox of its own, holding leaves or further groups. */
export interface LayerGroup {
  kind: 'group';
  key: string;
  label: string;
  children: LayerNode[];
  count?: number;
}

export type LayerNode = LayerGroup | LayerLeaf;

/** What a checkbox shows for a group, given which leaves are ticked. */
export type LayerState = 'on' | 'off' | 'mixed';

function leaf(key: string, label: string, ids: string[], on: boolean, count?: number): LayerLeaf {
  return { kind: 'leaf', key, label, ids, on, ...(count !== undefined && { count }) };
}

const byLabel = (a: LayerNode, b: LayerNode) => a.label.localeCompare(b.label);

/** The types the map places, in whatever order the file lists them, minus anything the catalog cannot draw. */
function placedTypes(level: Level, catalog: Catalog): string[] {
  return Object.keys(level.objects).filter(
    (id) => (level.objects[id]?.length ?? 0) > 0 && catalog.types[id] !== undefined,
  );
}

/** How many objects the level places across a set of catalog type ids. */
function objectCount(level: Level, ids: readonly string[]): number {
  return ids.reduce((total, id) => total + (level.objects[id]?.length ?? 0), 0);
}

function baseGroup(level: Level, catalog: Catalog, placed: string[]): LayerGroup {
  const footprints = placed
    .filter((id) => drawableIn(catalog.types[id]!, level.look).collider !== undefined)
    .map((id) => leaf(`base/collision/${id}`, catalog.types[id]!.label, [colliderLayer(id)], false))
    .sort(byLabel);
  return {
    kind: 'group',
    key: 'base',
    label: 'Base',
    children: [
      leaf('base/terrain', 'Terrain', [TERRAIN_LAYER], true),
      {
        kind: 'group',
        key: 'base/collision',
        label: 'Collision',
        children: [
          leaf('base/collision/terrain', 'Terrain', [COLLISION_LAYER], false),
          ...footprints,
        ],
      },
    ],
  };
}

/** Whether a subgroup's types are separate things, which their labels say and nothing declares. */
function breaksDown(catalog: Catalog, sub: string): boolean {
  const labels = new Set(
    Object.values(catalog.types).filter((type) => type.sub === sub).map((type) => type.label),
  );
  return labels.size > 1;
}

function subNode(
  catalog: Catalog,
  level: Level,
  group: string,
  sub: string,
  label: string,
  ids: string[],
): LayerNode {
  // Read from the whole vocabulary, not from what this level places, so that a level holding one gold item
  // still lists that item rather than collapsing the subgroup into it.
  if (!breaksDown(catalog, sub)) return leaf(`${group}/${sub}`, label, ids, true, objectCount(level, ids));
  return {
    kind: 'group',
    key: `${group}/${sub}`,
    label,
    count: objectCount(level, ids),
    children: ids
      .map((id) => leaf(`${group}/${sub}/${id}`, catalog.types[id]!.label, [id], true, objectCount(level, [id])))
      .sort(byLabel),
  };
}

function catalogGroup(
  catalog: Catalog,
  level: Level,
  group: { id: string; label: string },
  placed: string[],
): LayerGroup | null {
  const ids = placed.filter((id) => catalog.types[id]!.group === group.id);
  if (ids.length === 0) return null;

  const children: LayerNode[] = [];
  for (const sub of catalog.subs.filter((entry) => entry.group === group.id)) {
    const under = ids.filter((id) => catalog.types[id]!.sub === sub.id);
    if (under.length > 0) children.push(subNode(catalog, level, group.id, sub.id, sub.label, under));
  }
  children.push(
    ...ids
      .filter((id) => catalog.types[id]!.sub === undefined)
      .map((id) => leaf(`${group.id}/${id}`, catalog.types[id]!.label, [id], true, objectCount(level, [id])))
      .sort(byLabel),
  );
  return { kind: 'group', key: group.id, label: group.label, count: objectCount(level, ids), children };
}

/** The two leaves of the Info Overlays group, each with the family of markers it covers. */
const INFO_LEAVES: ReadonlyArray<readonly [string, string, 'bonus' | 'exit']> = [
  ['info/bonus', 'Bonus Destination Info', 'bonus'],
  ['info/exit', 'Exit Destination Info', 'exit'],
];

/** The labels a level's exits carry, or nothing where it has no exits to label. */
function infoGroup(level: Level, catalog: Catalog): LayerGroup | null {
  const children: LayerNode[] = [];
  let count = 0;
  for (const [key, label, kind] of INFO_LEAVES) {
    const links = level.links.filter((link) => catalog.tags[link.tag]?.kind === kind);
    if (links.length === 0) continue;
    const ids = [...new Set(links.map((link) => tagLayer(link.tag)))];
    children.push(leaf(key, label, ids, false, links.length));
    count += links.length;
  }
  if (children.length === 0) return null;
  return { kind: 'group', key: 'info', label: 'Info Overlays', count, children };
}

/** Builds the layers of one level, which only ever offers what that level places. */
export function buildLevelLayers(level: Level, catalog: Catalog): LayerNode[] {
  const placed = placedTypes(level, catalog);
  const groups = catalog.groups
    .map((group) => catalogGroup(catalog, level, group, placed))
    .filter((group): group is LayerGroup => group !== null);
  const info = infoGroup(level, catalog);
  return [baseGroup(level, catalog, placed), ...groups, ...(info ? [info] : [])];
}

/** The Layers panel's name for each signpost and the order it lists them in, both matching the Explorer's. */
const SIGN_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['level', 'Level Complete'],
  ['checkpoint', 'Check Point'],
  ['gate', 'Connection Cave'],
  ['trace', 'Traces of Dugette'],
];

/** Builds the layers of one world map: the screen, the walk path, and one leaf per signpost it stands. */
export function buildWorldLayers(world: WorldMap, catalog: Catalog): LayerNode[] {
  const stands = (id: string) =>
    catalog.signs[id]?.sprites[String(world.n)] !== undefined &&
    world.nodes.some((node) => node.sign === id);
  const nodes: LayerNode[] = [
    leaf('world/map', 'Map', [TERRAIN_LAYER], true),
    leaf('world/path', 'Path', [PATH_LAYER], false),
  ];
  const signs = SIGN_LABELS.filter(([id]) => stands(id)).map(([id, label]) =>
    leaf(`world/signs/${id}`, label, [id], true),
  );
  // A world that stands no signposts gets no group for them.
  if (signs.length > 0) {
    nodes.push({ kind: 'group', key: 'world/signs', label: 'Signs', children: signs });
  }
  return nodes;
}

/** Every leaf under these nodes, in the order the panel lists them. */
export function leavesOf(nodes: readonly LayerNode[]): LayerLeaf[] {
  return nodes.flatMap((node) => (node.kind === 'leaf' ? [node] : leavesOf(node.children)));
}

/** The scene layers to draw, given the leaves that are ticked. */
export function visibleIds(nodes: readonly LayerNode[], on: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>();
  for (const held of leavesOf(nodes)) {
    if (on.has(held.key)) for (const id of held.ids) ids.add(id);
  }
  return ids;
}

/** Every leaf key a click on one node's checkbox sets. */
export function keysUnder(node: LayerNode): string[] {
  return leavesOf([node]).map((held) => held.key);
}

/** The node one key names, group or leaf, or undefined where the current map has none. */
export function nodeByKey(nodes: readonly LayerNode[], key: string): LayerNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    if (node.kind === 'group') {
      const found = nodeByKey(node.children, key);
      if (found) return found;
    }
  }
  return undefined;
}

/** What one node's checkbox shows, which for a group is read off its leaves rather than stored. */
export function stateOf(node: LayerNode, on: ReadonlySet<string>): LayerState {
  const keys = keysUnder(node);
  const ticked = keys.filter((key) => on.has(key)).length;
  if (ticked === 0) return 'off';
  return ticked === keys.length ? 'on' : 'mixed';
}

/** What one click on a node leaves ticked: everything under it, unless all of it already was. */
export function toggled(on: ReadonlySet<string>, node: LayerNode): Set<string> {
  const next = new Set(on);
  const turnOff = stateOf(node, on) === 'on';
  for (const key of keysUnder(node)) {
    if (turnOff) next.delete(key);
    else next.add(key);
  }
  return next;
}

/** The nodes a search leaves visible, a group whose own name matches keeping all of it. */
export function matching(nodes: readonly LayerNode[], text: string): LayerNode[] {
  const wanted = text.trim().toLowerCase();
  if (wanted === '') return [...nodes];
  const kept: LayerNode[] = [];
  for (const node of nodes) {
    if (node.label.toLowerCase().includes(wanted)) {
      kept.push(node);
      continue;
    }
    if (node.kind === 'group') {
      const children = matching(node.children, wanted);
      if (children.length > 0) kept.push({ ...node, children });
    }
  }
  return kept;
}

/** Every group key under these nodes, which is what collapsing all of them names. */
export function groupKeys(nodes: readonly LayerNode[]): string[] {
  return nodes.flatMap((node) => (node.kind === 'group' ? [node.key, ...groupKeys(node.children)] : []));
}

/** What a command acting on many nodes at once leaves ticked, everything outside them untouched. */
export function setAll(
  on: ReadonlySet<string>,
  nodes: readonly LayerNode[],
  value: boolean,
): Set<string> {
  const next = new Set(on);
  for (const held of leavesOf(nodes)) {
    if (value) next.add(held.key);
    else next.delete(held.key);
  }
  return next;
}
